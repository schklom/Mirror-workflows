<?php
class RPC extends Handler_Protected {

	/*function csrf_ignore($method) {
		$csrf_ignored = array("completelabels");

		return array_search($method, $csrf_ignored) !== false;
	}*/

	private function _translations_as_array() {

		global $text_domains;

		$rv = [];

		foreach (array_keys($text_domains) as $domain) {

			/** @var gettext_reader $l10n */
			$l10n = _get_reader($domain);

			for ($i = 0; $i < $l10n->total; $i++) {
				if (isset($l10n->table_originals[$i * 2 + 2]) && $orig = $l10n->get_original_string($i)) {
					if(strpos($orig, "\000") !== false) { // Plural forms
						$key = explode(chr(0), $orig);

						$rv[$key[0]] = _ngettext($key[0], $key[1], 1); // Singular
						$rv[$key[1]] = _ngettext($key[0], $key[1], 2); // Plural
					} else {
						$translation = _dgettext($domain,$orig);
						$rv[$orig] = $translation;
					}
				}
			}
		}

		return $rv;
	}


	function togglepref() {
		$key = clean($_REQUEST["key"]);
		set_pref($key, !get_pref($key));
		$value = get_pref($key);

		print json_encode(array("param" =>$key, "value" => $value));
	}

	function setpref() {
		// set_pref escapes input, so no need to double escape it here
		$key = clean($_REQUEST['key']);
		$value = $_REQUEST['value'];

		set_pref($key, $value, $_SESSION["uid"], $key != 'USER_STYLESHEET');

		print json_encode(array("param" =>$key, "value" => $value));
	}

	function mark() {
		$mark = clean($_REQUEST["mark"]);
		$id = clean($_REQUEST["id"]);

		$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET marked = ?,
					last_marked = NOW()
					WHERE ref_id = ? AND owner_uid = ?");

		$sth->execute([$mark, $id, $_SESSION['uid']]);

		print json_encode(array("message" => "UPDATE_COUNTERS"));
	}

	function delete() {
		$ids = explode(",", clean($_REQUEST["ids"]));
		$ids_qmarks = arr_qmarks($ids);

		$sth = $this->pdo->prepare("DELETE FROM ttrss_user_entries
			WHERE ref_id IN ($ids_qmarks) AND owner_uid = ?");
		$sth->execute(array_merge($ids, [$_SESSION['uid']]));

		Article::_purge_orphans();

		print json_encode(array("message" => "UPDATE_COUNTERS"));
	}

	function publ() {
		$pub = clean($_REQUEST["pub"]);
		$id = clean($_REQUEST["id"]);

		$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET
			published = ?, last_published = NOW()
			WHERE ref_id = ? AND owner_uid = ?");

		$sth->execute([$pub, $id, $_SESSION['uid']]);

		print json_encode(array("message" => "UPDATE_COUNTERS"));
	}

	function getRuntimeInfo() {
		$reply = [
			'runtime-info' => $this->_make_runtime_info()
		];

		print json_encode($reply);
	}

	function getAllCounters() {
		@$seq = (int) $_REQUEST['seq'];

		$feed_id_count = (int)$_REQUEST["feed_id_count"];
		$label_id_count = (int)$_REQUEST["label_id_count"];

		// it seems impossible to distinguish empty array [] from a null - both become unset in $_REQUEST
		// so, count is >= 0 means we had an array, -1 means null
		// we need null because it means "return all counters"; [] would return nothing
		if ($feed_id_count == -1)
			$feed_ids = null;
		else
			$feed_ids = array_map("intval", clean($_REQUEST["feed_ids"] ?? []));

		if ($label_id_count == -1)
			$label_ids = null;
		else
			$label_ids = array_map("intval", clean($_REQUEST["label_ids"] ?? []));

		$counters = is_array($feed_ids) && !get_pref(Prefs::DISABLE_CONDITIONAL_COUNTERS) ?
			Counters::get_conditional($feed_ids, $label_ids) : Counters::get_all();

		$reply = [
			'counters' => $counters,
			'seq' => $seq
		];

		print json_encode($reply);
	}

	/* GET["cmode"] = 0 - mark as read, 1 - as unread, 2 - toggle */
	function catchupSelected() {
		$ids = array_map("intval", clean($_REQUEST["ids"] ?? []));
		$cmode = (int)clean($_REQUEST["cmode"]);

		if (count($ids) > 0)
			Article::_catchup_by_id($ids, $cmode);

		print json_encode(["message" => "UPDATE_COUNTERS",
			"labels" => Article::_labels_of($ids),
			"feeds" => Article::_feeds_of($ids)]);
	}

	function markSelected() {
		$ids = array_map("intval", clean($_REQUEST["ids"] ?? []));
		$cmode = (int)clean($_REQUEST["cmode"]);

		if (count($ids) > 0)
			$this->markArticlesById($ids, $cmode);

		print json_encode(["message" => "UPDATE_COUNTERS",
		"labels" => Article::_labels_of($ids),
			"feeds" => Article::_feeds_of($ids)]);
	}

	function publishSelected() {
		$ids = array_map("intval", clean($_REQUEST["ids"] ?? []));
		$cmode = (int)clean($_REQUEST["cmode"]);

		if (count($ids) > 0)
			$this->publishArticlesById($ids, $cmode);

		print json_encode(["message" => "UPDATE_COUNTERS",
			"labels" => Article::_labels_of($ids),
			"feeds" => Article::_feeds_of($ids)]);
	}

	function sanityCheck() {
		$_SESSION["hasSandbox"] = clean($_REQUEST["hasSandbox"]) === "true";
		$_SESSION["clientTzOffset"] = clean($_REQUEST["clientTzOffset"]);

		$client_location = $_REQUEST["clientLocation"];

		$error = Errors::E_SUCCESS;
		$error_params = [];

		$client_scheme = parse_url($client_location, PHP_URL_SCHEME);
		$server_scheme = parse_url(Config::get_self_url(), PHP_URL_SCHEME);

		if (Config::is_migration_needed()) {
			$error = Errors::E_SCHEMA_MISMATCH;
		} else if ($client_scheme != $server_scheme) {
			$error = Errors::E_URL_SCHEME_MISMATCH;
			$error_params["client_scheme"] = $client_scheme;
			$error_params["server_scheme"] = $server_scheme;
			$error_params["self_url_path"] = Config::get_self_url();
		}

		if ($error == Errors::E_SUCCESS) {
			$reply = [];

			$reply['init-params'] = $this->_make_init_params();
			$reply['runtime-info'] = $this->_make_runtime_info();
			$reply['translations'] = $this->_translations_as_array();

			print json_encode($reply);
		} else {
			print Errors::to_json($error, $error_params);
		}
	}

	/*function completeLabels() {
		$search = clean($_REQUEST["search"]);

		$sth = $this->pdo->prepare("SELECT DISTINCT caption FROM
				ttrss_labels2
				WHERE owner_uid = ? AND
				LOWER(caption) LIKE LOWER(?) ORDER BY caption
				LIMIT 5");
		$sth->execute([$_SESSION['uid'], "%$search%"]);

		print "<ul>";
		while ($line = $sth->fetch()) {
			print "<li>" . $line["caption"] . "</li>";
		}
		print "</ul>";
	}*/

	function catchupFeed() {
		$feed_id = clean($_REQUEST['feed_id']);
		$is_cat = clean($_REQUEST['is_cat']) == "true";
		$mode = clean($_REQUEST['mode'] ?? '');
		$search_query = clean($_REQUEST['search_query']);
		$search_lang = clean($_REQUEST['search_lang']);

		Feeds::_catchup($feed_id, $is_cat, false, $mode, [$search_query, $search_lang]);

		// return counters here synchronously so that frontend can figure out next unread feed properly
		print json_encode(['counters' => Counters::get_all()]);

		//print json_encode(array("message" => "UPDATE_COUNTERS"));
	}

	function setWidescreen() {
		$wide = (int) clean($_REQUEST["wide"]);

		set_pref(Prefs::WIDESCREEN_MODE, $wide);

		print json_encode(["wide" => $wide]);
	}

	static function updaterandomfeed_real() {

		$default_interval = (int) Prefs::get_default(Prefs::DEFAULT_UPDATE_INTERVAL);

		// Test if the feed need a update (update interval exceded).
		if (Config::get(Config::DB_TYPE) == "pgsql") {
			$update_limit_qpart = "AND ((
					update_interval = 0
						AND (p.value IS NULL OR p.value != '-1')
						AND last_updated < NOW() - CAST((COALESCE(p.value, '$default_interval') || ' minutes') AS INTERVAL)
				) OR (
					update_interval > 0
						AND last_updated < NOW() - CAST((update_interval || ' minutes') AS INTERVAL)
				) OR (
					update_interval >= 0
						AND (p.value IS NULL OR p.value != '-1')
						AND (last_updated = '1970-01-01 00:00:00' OR last_updated IS NULL)
				))";
		} else {
			$update_limit_qpart = "AND ((
					update_interval = 0
						AND (p.value IS NULL OR p.value != '-1')
						AND last_updated < DATE_SUB(NOW(), INTERVAL CONVERT(COALESCE(p.value, '$default_interval'), SIGNED INTEGER) MINUTE)
				) OR (
					update_interval > 0
						AND last_updated < DATE_SUB(NOW(), INTERVAL update_interval MINUTE)
				) OR (
					update_interval >= 0
						AND (p.value IS NULL OR p.value != '-1')
						AND (last_updated = '1970-01-01 00:00:00' OR last_updated IS NULL)
				))";
		}

		// Test if feed is currently being updated by another process.
		if (Config::get(Config::DB_TYPE) == "pgsql") {
			$updstart_thresh_qpart = "AND (last_update_started IS NULL OR last_update_started < NOW() - INTERVAL '5 minutes')";
		} else {
			$updstart_thresh_qpart = "AND (last_update_started IS NULL OR last_update_started < DATE_SUB(NOW(), INTERVAL 5 MINUTE))";
		}

		$random_qpart = Db::sql_random_function();

		$pdo = Db::pdo();

		// we could be invoked from public.php with no active session
		if (!empty($_SESSION["uid"])) {
			$owner_check_qpart = "AND f.owner_uid = ".$pdo->quote($_SESSION["uid"]);
		} else {
			$owner_check_qpart = "";
		}

		$query = "SELECT f.feed_url,f.id
			FROM
				ttrss_feeds f, ttrss_users u LEFT JOIN ttrss_user_prefs2 p ON
					(p.owner_uid = u.id AND profile IS NULL AND pref_name = 'DEFAULT_UPDATE_INTERVAL')
			WHERE
				f.owner_uid = u.id
				$owner_check_qpart
				$update_limit_qpart
				$updstart_thresh_qpart
			ORDER BY $random_qpart LIMIT 30";

		$res = $pdo->query($query);

		$num_updated = 0;

		$tstart = time();

		while ($line = $res->fetch()) {
			$feed_id = $line["id"];

			if (time() - $tstart < ini_get("max_execution_time") * 0.7) {
				RSSUtils::update_rss_feed($feed_id, true);
				++$num_updated;
			} else {
				break;
			}
		}

		// Purge orphans and cleanup tags
		Article::_purge_orphans();
		//cleanup_tags(14, 50000);

		if ($num_updated > 0) {
			print json_encode(array("message" => "UPDATE_COUNTERS",
				"num_updated" => $num_updated));
		} else {
			print json_encode(array("message" => "NOTHING_TO_UPDATE"));
		}

	}

	function updaterandomfeed() {
		self::updaterandomfeed_real();
	}

	private function markArticlesById($ids, $cmode) {

		$ids_qmarks = arr_qmarks($ids);

		if ($cmode == 0) {
			$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET
				marked = false, last_marked = NOW()
					WHERE ref_id IN ($ids_qmarks) AND owner_uid = ?");
		} else if ($cmode == 1) {
			$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET
				marked = true, last_marked = NOW()
					WHERE ref_id IN ($ids_qmarks) AND owner_uid = ?");
		} else {
			$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET
				marked = NOT marked,last_marked = NOW()
					WHERE ref_id IN ($ids_qmarks) AND owner_uid = ?");
		}

		$sth->execute(array_merge($ids, [$_SESSION['uid']]));
	}

	private function publishArticlesById($ids, $cmode) {

		$ids_qmarks = arr_qmarks($ids);

		if ($cmode == 0) {
			$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET
				published = false, last_published = NOW()
					WHERE ref_id IN ($ids_qmarks) AND owner_uid = ?");
		} else if ($cmode == 1) {
			$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET
				published = true, last_published = NOW()
					WHERE ref_id IN ($ids_qmarks) AND owner_uid = ?");
		} else {
			$sth = $this->pdo->prepare("UPDATE ttrss_user_entries SET
				published = NOT published,last_published = NOW()
					WHERE ref_id IN ($ids_qmarks) AND owner_uid = ?");
		}

		$sth->execute(array_merge($ids, [$_SESSION['uid']]));
	}

	function log() {
		$msg = clean($_REQUEST['msg'] ?? "");
		$file = basename(clean($_REQUEST['file'] ?? ""));
		$line = (int) clean($_REQUEST['line'] ?? 0);
		$context = clean($_REQUEST['context'] ?? "");

		if ($msg) {
			Logger::log_error(E_USER_WARNING,
				$msg, 'client-js:' . $file, $line, $context);

			echo json_encode(array("message" => "HOST_ERROR_LOGGED"));
		}
	}

	function checkforupdates() {
		$rv = ["changeset" => [], "plugins" => []];

		$version = Config::get_version(false);

		$git_timestamp = $version["timestamp"] ?? false;
		$git_commit = $version["commit"] ?? false;

		if (Config::get(Config::CHECK_FOR_UPDATES) && $_SESSION["access_level"] >= 10 && $git_timestamp) {
			$content = @UrlHelper::fetch(["url" => "https://tt-rss.org/version.json"]);

			if ($content) {
				$content = json_decode($content, true);

				if ($content && isset($content["changeset"])) {
					if ($git_timestamp < (int)$content["changeset"]["timestamp"] &&
						$git_commit != $content["changeset"]["id"]) {

						$rv["changeset"] = $content["changeset"];
					}
				}
			}

			$rv["plugins"] = Pref_Prefs::_get_updated_plugins();
		}

		print json_encode($rv);
	}

	private function _make_init_params() {
		$params = array();

		foreach ([Prefs::ON_CATCHUP_SHOW_NEXT_FEED, Prefs::HIDE_READ_FEEDS,
			Prefs::ENABLE_FEED_CATS, Prefs::FEEDS_SORT_BY_UNREAD,
			Prefs::CONFIRM_FEED_CATCHUP,  Prefs::CDM_AUTO_CATCHUP,
			Prefs::FRESH_ARTICLE_MAX_AGE, Prefs::HIDE_READ_SHOWS_SPECIAL,
			Prefs::COMBINED_DISPLAY_MODE, Prefs::DEBUG_HEADLINE_IDS, Prefs::CDM_ENABLE_GRID] as $param) {

			$params[strtolower($param)] = (int) get_pref($param);
		}

		$params["safe_mode"] = !empty($_SESSION["safe_mode"]);
		$params["check_for_updates"] = Config::get(Config::CHECK_FOR_UPDATES);
		$params["icons_url"] = Config::get(Config::ICONS_URL);
		$params["cookie_lifetime"] = Config::get(Config::SESSION_COOKIE_LIFETIME);
		$params["default_view_mode"] = get_pref(Prefs::_DEFAULT_VIEW_MODE);
		$params["default_view_limit"] = (int) get_pref(Prefs::_DEFAULT_VIEW_LIMIT);
		$params["default_view_order_by"] = get_pref(Prefs::_DEFAULT_VIEW_ORDER_BY);
		$params["bw_limit"] = (int) ($_SESSION["bw_limit"] ?? false);
		$params["is_default_pw"] = UserHelper::is_default_password();
		$params["label_base_index"] = LABEL_BASE_INDEX;

		$theme = get_pref(Prefs::USER_CSS_THEME);
		$params["theme"] = theme_exists($theme) ? $theme : "";

		$params["plugins"] = implode(", ", PluginHost::getInstance()->get_plugin_names());

		$params["php_platform"] = PHP_OS;
		$params["php_version"] = PHP_VERSION;

		$pdo = Db::pdo();

		$sth = $pdo->prepare("SELECT MAX(id) AS mid, COUNT(*) AS nf FROM
				ttrss_feeds WHERE owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);
		$row = $sth->fetch();

		$max_feed_id = $row["mid"];
		$num_feeds = $row["nf"];

		$params["self_url_prefix"] = Config::get_self_url();
		$params["max_feed_id"] = (int) $max_feed_id;
		$params["num_feeds"] = (int) $num_feeds;
		$params["hotkeys"] = $this->get_hotkeys_map();
		$params["widescreen"] = (int) get_pref(Prefs::WIDESCREEN_MODE);
		$params['simple_update'] = Config::get(Config::SIMPLE_UPDATE_MODE);
		$params["icon_indicator_white"] = $this->image_to_base64("images/indicator_white.gif");
		$params["labels"] = Labels::get_all($_SESSION["uid"]);

		return $params;
	}

	private function image_to_base64($filename) {
		if (file_exists($filename)) {
			$ext = pathinfo($filename, PATHINFO_EXTENSION);

			return "data:image/$ext;base64," . base64_encode((string)file_get_contents($filename));
		} else {
			return "";
		}
	}

	static function _make_runtime_info() {
		$data = array();

		$pdo = Db::pdo();

		$sth = $pdo->prepare("SELECT MAX(id) AS mid, COUNT(*) AS nf FROM
				ttrss_feeds WHERE owner_uid = ?");
		$sth->execute([$_SESSION['uid']]);
		$row = $sth->fetch();

		$max_feed_id = $row['mid'];
		$num_feeds = $row['nf'];

		$data["max_feed_id"] = (int) $max_feed_id;
		$data["num_feeds"] = (int) $num_feeds;
		$data['cdm_expanded'] = get_pref(Prefs::CDM_EXPANDED);
		$data["labels"] = Labels::get_all($_SESSION["uid"]);

		if (Config::get(Config::LOG_DESTINATION) == 'sql' && $_SESSION['access_level'] >= 10) {
			if (Config::get(Config::DB_TYPE) == 'pgsql') {
				$log_interval = "created_at > NOW() - interval '1 hour'";
			} else {
				$log_interval = "created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
			}

			$sth = $pdo->prepare("SELECT COUNT(id) AS cid
				FROM ttrss_error_log
			WHERE
				errno NOT IN (".E_USER_NOTICE.", ".E_USER_DEPRECATED.") AND
				$log_interval AND
				errstr NOT LIKE '%imagecreatefromstring(): Data is not in a recognized format%'");
			$sth->execute();

			if ($row = $sth->fetch()) {
				$data['recent_log_events'] = $row['cid'];
			}
		}

		if (file_exists(Config::get(Config::LOCK_DIRECTORY) . "/update_daemon.lock")) {

			$data['daemon_is_running'] = (int) file_is_locked("update_daemon.lock");

			if (time() - ($_SESSION["daemon_stamp_check"] ?? 0) > 30) {

				$stamp = (int) @file_get_contents(Config::get(Config::LOCK_DIRECTORY) . "/update_daemon.stamp");

				if ($stamp) {
					$stamp_delta = time() - $stamp;

					if ($stamp_delta > 1800) {
						$stamp_check = 0;
					} else {
						$stamp_check = 1;
						$_SESSION["daemon_stamp_check"] = time();
					}

					$data['daemon_stamp_ok'] = $stamp_check;

					$stamp_fmt = date("Y.m.d, G:i", $stamp);

					$data['daemon_stamp'] = $stamp_fmt;
				}
			}
		}

		return $data;
	}

	static function get_hotkeys_info() {
		$hotkeys = array(
			__("Navigation") => array(
				"next_feed" => __("Open next feed"),
				"prev_feed" => __("Open previous feed"),
				"next_article_or_scroll" => __("Open next article (in combined mode, scroll down)"),
				"prev_article_or_scroll" => __("Open previous article (in combined mode, scroll up)"),
				"next_headlines_page" => __("Scroll headlines by one page down"),
				"prev_headlines_page" => __("Scroll headlines by one page up"),
				"next_article_noscroll" => __("Open next article"),
				"prev_article_noscroll" => __("Open previous article"),
				"next_article_noexpand" => __("Move to next article (don't expand)"),
				"prev_article_noexpand" => __("Move to previous article (don't expand)"),
				"search_dialog" => __("Show search dialog"),
				"cancel_search" => __("Cancel active search")),
			__("Article") => array(
				"toggle_mark" => __("Toggle starred"),
				"toggle_publ" => __("Toggle published"),
				"toggle_unread" => __("Toggle unread"),
				"edit_tags" => __("Edit tags"),
				"open_in_new_window" => __("Open in new window"),
				"catchup_below" => __("Mark below as read"),
				"catchup_above" => __("Mark above as read"),
				"article_scroll_down" => __("Scroll down"),
				"article_scroll_up" => __("Scroll up"),
				"article_page_down" => __("Scroll down page"),
				"article_page_up" => __("Scroll up page"),
				"select_article_cursor" => __("Select article under cursor"),
				"email_article" => __("Email article"),
				"close_article" => __("Close/collapse article"),
				"toggle_expand" => __("Toggle article expansion (combined mode)"),
				"toggle_widescreen" => __("Toggle widescreen mode"),
				"toggle_full_text" => __("Toggle full article text via Readability")),
			__("Article selection") => array(
				"select_all" => __("Select all articles"),
				"select_unread" => __("Select unread"),
				"select_marked" => __("Select starred"),
				"select_published" => __("Select published"),
				"select_invert" => __("Invert selection"),
				"select_none" => __("Deselect everything")),
			__("Feed") => array(
				"feed_refresh" => __("Refresh current feed"),
				"feed_unhide_read" => __("Un/hide read feeds"),
				"feed_subscribe" => __("Subscribe to feed"),
				"feed_edit" => __("Edit feed"),
				"feed_catchup" => __("Mark as read"),
				"feed_reverse" => __("Reverse headlines"),
				"feed_toggle_vgroup" => __("Toggle headline grouping"),
				"feed_toggle_grid" => __("Toggle grid view"),
				"feed_debug_update" => __("Debug feed update"),
				"feed_debug_viewfeed" => __("Debug viewfeed()"),
				"catchup_all" => __("Mark all feeds as read"),
				"cat_toggle_collapse" => __("Un/collapse current category"),
				"toggle_cdm_expanded" => __("Toggle auto expand in combined mode"),
				"toggle_combined_mode" => __("Toggle combined mode")),
			__("Go to") => array(
				"goto_all" => __("All articles"),
				"goto_fresh" => __("Fresh"),
				"goto_marked" => __("Starred"),
				"goto_published" => __("Published"),
				"goto_read" => __("Recently read"),
				"goto_prefs" => __("Preferences")),
			__("Other") => array(
				"create_label" => __("Create label"),
				"create_filter" => __("Create filter"),
				"collapse_sidebar" => __("Un/collapse sidebar"),
				"help_dialog" => __("Show help dialog"))
		);

		PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_HOTKEY_INFO,
			function ($result) use (&$hotkeys) {
				$hotkeys = $result;
			},
			$hotkeys);

		return $hotkeys;
	}

	// {3} - 3 panel mode only
	// {C} - combined mode only
	static function get_hotkeys_map() {
		$hotkeys = array(
			"k" => "next_feed",
			"j" => "prev_feed",
			"n" => "next_article_noscroll",
			"p" => "prev_article_noscroll",
			"N" => "article_page_down",
			"P" => "article_page_up",
			"*(33)|Shift+PgUp" => "article_page_up",
			"*(34)|Shift+PgDn" => "article_page_down",
			"{3}(38)|Up" => "prev_article_or_scroll",
			"{3}(40)|Down" => "next_article_or_scroll",
			"*(38)|Shift+Up" => "article_scroll_up",
			"*(40)|Shift+Down" => "article_scroll_down",
			"^(38)|Ctrl+Up" => "prev_article_noscroll",
			"^(40)|Ctrl+Down" => "next_article_noscroll",
			"/" => "search_dialog",
			"\\" => "cancel_search",
			"s" => "toggle_mark",
			"S" => "toggle_publ",
			"u" => "toggle_unread",
			"T" => "edit_tags",
			"o" => "open_in_new_window",
			"c p" => "catchup_below",
			"c n" => "catchup_above",
			"a W" => "toggle_widescreen",
			"a e" => "toggle_full_text",
			"e" => "email_article",
			"a q" => "close_article",
			"a s" => "article_span_grid",
			"a a" => "select_all",
			"a u" => "select_unread",
			"a U" => "select_marked",
			"a p" => "select_published",
			"a i" => "select_invert",
			"a n" => "select_none",
			"f r" => "feed_refresh",
			"f a" => "feed_unhide_read",
			"f s" => "feed_subscribe",
			"f e" => "feed_edit",
			"f q" => "feed_catchup",
			"f x" => "feed_reverse",
			"f g" => "feed_toggle_vgroup",
			"f G" => "feed_toggle_grid",
			"f D" => "feed_debug_update",
			"f %" => "feed_debug_viewfeed",
			"f C" => "toggle_combined_mode",
			"f c" => "toggle_cdm_expanded",
			"Q" => "catchup_all",
			"x" => "cat_toggle_collapse",
			"g a" => "goto_all",
			"g f" => "goto_fresh",
			"g s" => "goto_marked",
			"g p" => "goto_published",
			"g r" => "goto_read",
			"g P" => "goto_prefs",
			"r" => "select_article_cursor",
			"c l" => "create_label",
			"c f" => "create_filter",
			"c s" => "collapse_sidebar",
			"?" => "help_dialog",
		);

		PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_HOTKEY_MAP,
			function ($result) use (&$hotkeys) {
				$hotkeys = $result;
			},
			$hotkeys);

		$prefixes = array();

		foreach (array_keys($hotkeys) as $hotkey) {
			$pair = explode(" ", (string)$hotkey, 2);

			if (count($pair) > 1 && !in_array($pair[0], $prefixes)) {
				array_push($prefixes, $pair[0]);
			}
		}

		return array($prefixes, $hotkeys);
	}

	function hotkeyHelp() {
		$info = self::get_hotkeys_info();
		$imap = self::get_hotkeys_map();
		$omap = array();

		foreach ($imap[1] as $sequence => $action) {
			if (!isset($omap[$action])) $omap[$action] = array();

			array_push($omap[$action], $sequence);
		}

		?>
		<ul class='panel panel-scrollable hotkeys-help' style='height : 300px'>
		<?php

		foreach ($info as $section => $hotkeys) {
			?>
			<li><h3><?= $section ?></h3></li>
			<?php

			foreach ($hotkeys as $action => $description) {

				if (!empty($omap[$action])) {
					foreach ($omap[$action] as $sequence) {
						if (strpos($sequence, "|") !== false) {
							$sequence = substr($sequence,
								strpos($sequence, "|")+1,
								strlen($sequence));
						} else {
							$keys = explode(" ", $sequence);

							for ($i = 0; $i < count($keys); $i++) {
								if (strlen($keys[$i]) > 1) {
									$tmp = '';
									foreach (str_split($keys[$i]) as $c) {
										switch ($c) {
											case '*':
												$tmp .= __('Shift') . '+';
												break;
											case '^':
												$tmp .= __('Ctrl') . '+';
												break;
											default:
												$tmp .= $c;
										}
									}
									$keys[$i] = $tmp;
								}
							}
							$sequence = join(" ", $keys);
						}

						?>
						<li>
							<div class='hk'><code><?= $sequence ?></code></div>
							<div class='desc'><?= $description ?></div>
						</li>
						<?php
					}
				}
			}
		}
		?>
		</ul>
	<footer class='text-center'>
		<?= \Controls\submit_tag(__('Close this window')) ?>
	</footer>
	<?php
	}
}
