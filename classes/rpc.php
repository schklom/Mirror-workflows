<?php
class RPC extends Handler_Protected {

	function csrf_ignore($method) {
		$csrf_ignored = array("completelabels", "saveprofile");

		return array_search($method, $csrf_ignored) !== false;
	}

	function setprofile() {
		$_SESSION["profile"] = (int) clean($_REQUEST["id"]);

		// default value
		if (!$_SESSION["profile"]) $_SESSION["profile"] = null;
	}

	function remprofiles() {
		$ids = explode(",", trim(clean($_REQUEST["ids"])));

		foreach ($ids as $id) {
			if ($_SESSION["profile"] != $id) {
				$sth = $this->pdo->prepare("DELETE FROM ttrss_settings_profiles WHERE id = ? AND
							owner_uid = ?");
				$sth->execute([$id, $_SESSION['uid']]);
			}
		}
	}

	// Silent
	function addprofile() {
		$title = trim(clean($_REQUEST["title"]));

		if ($title) {
			$this->pdo->beginTransaction();

			$sth = $this->pdo->prepare("SELECT id FROM ttrss_settings_profiles
				WHERE title = ? AND owner_uid = ?");
			$sth->execute([$title, $_SESSION['uid']]);

			if (!$sth->fetch()) {

				$sth = $this->pdo->prepare("INSERT INTO ttrss_settings_profiles (title, owner_uid)
							VALUES (?, ?)");

				$sth->execute([$title, $_SESSION['uid']]);

				$sth = $this->pdo->prepare("SELECT id FROM ttrss_settings_profiles WHERE
					title = ? AND owner_uid = ?");
				$sth->execute([$title, $_SESSION['uid']]);

				if ($row = $sth->fetch()) {
					$profile_id = $row['id'];

					if ($profile_id) {
						Pref_Prefs::initialize_user_prefs($_SESSION["uid"], $profile_id);
					}
				}
			}

			$this->pdo->commit();
		}
	}

	function saveprofile() {
		$id = clean($_REQUEST["id"]);
		$title = trim(clean($_REQUEST["value"]));

		if ($id == 0) {
			print __("Default profile");
			return;
		}

		if ($title) {
			$sth = $this->pdo->prepare("UPDATE ttrss_settings_profiles
				SET title = ? WHERE id = ? AND
					owner_uid = ?");

			$sth->execute([$title, $id, $_SESSION['uid']]);
			print $title;
		}
	}

	function addfeed() {
		$feed = clean($_REQUEST['feed']);
		$cat = clean($_REQUEST['cat']);
		$need_auth = isset($_REQUEST['need_auth']);
		$login = $need_auth ? clean($_REQUEST['login']) : '';
		$pass = $need_auth ? trim(clean($_REQUEST['pass'])) : '';

		$rc = Feeds::subscribe_to_feed($feed, $cat, $login, $pass);

		print json_encode(array("result" => $rc));
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

		set_pref($key, $value, false, $key != 'USER_STYLESHEET');

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

		Article::purge_orphans();

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

	function getAllCounters() {
		@$seq = (int) $_REQUEST['seq'];

		$reply = [
			'counters' => Counters::getAllCounters(),
			'seq' => $seq
		];

		if ($seq % 2 == 0)
			$reply['runtime-info'] = $this->make_runtime_info();

		print json_encode($reply);
	}

	/* GET["cmode"] = 0 - mark as read, 1 - as unread, 2 - toggle */
	function catchupSelected() {
		$ids = explode(",", clean($_REQUEST["ids"]));
		$cmode = (int)clean($_REQUEST["cmode"]);

		Article::catchupArticlesById($ids, $cmode);

		print json_encode(array("message" => "UPDATE_COUNTERS", "ids" => $ids));
	}

	function markSelected() {
		$ids = explode(",", clean($_REQUEST["ids"]));
		$cmode = (int)clean($_REQUEST["cmode"]);

		$this->markArticlesById($ids, $cmode);

		print json_encode(array("message" => "UPDATE_COUNTERS"));
	}

	function publishSelected() {
		$ids = explode(",", clean($_REQUEST["ids"]));
		$cmode = (int)clean($_REQUEST["cmode"]);

		$this->publishArticlesById($ids, $cmode);

		print json_encode(array("message" => "UPDATE_COUNTERS"));
	}

	function sanityCheck() {
		$_SESSION["hasAudio"] = clean($_REQUEST["hasAudio"]) === "true";
		$_SESSION["hasSandbox"] = clean($_REQUEST["hasSandbox"]) === "true";
		$_SESSION["hasMp3"] = clean($_REQUEST["hasMp3"]) === "true";
		$_SESSION["clientTzOffset"] = clean($_REQUEST["clientTzOffset"]);

		$reply = array();

		$reply['error'] = sanity_check();

		if ($reply['error']['code'] == 0) {
			$reply['init-params'] = $this->make_init_params();
			$reply['runtime-info'] = $this->make_runtime_info();
		}

		print json_encode($reply);
	}

	function completeLabels() {
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
	}

	function catchupFeed() {
		$feed_id = clean($_REQUEST['feed_id']);
		$is_cat = clean($_REQUEST['is_cat']) == "true";
		$mode = clean($_REQUEST['mode']);
		$search_query = clean($_REQUEST['search_query']);
		$search_lang = clean($_REQUEST['search_lang']);

		Feeds::catchup_feed($feed_id, $is_cat, false, $mode, [$search_query, $search_lang]);

		// return counters here synchronously so that frontend can figure out next unread feed properly
		print json_encode(['counters' => Counters::getAllCounters()]);

		//print json_encode(array("message" => "UPDATE_COUNTERS"));
	}

	function setpanelmode() {
		$wide = (int) clean($_REQUEST["wide"]);

		setcookie("ttrss_widescreen", $wide,
			time() + COOKIE_LIFETIME_LONG);

		print json_encode(array("wide" => $wide));
	}

	static function updaterandomfeed_real() {

		// Test if the feed need a update (update interval exceded).
		if (DB_TYPE == "pgsql") {
			$update_limit_qpart = "AND ((
					ttrss_feeds.update_interval = 0
					AND ttrss_feeds.last_updated < NOW() - CAST((ttrss_user_prefs.value || ' minutes') AS INTERVAL)
				) OR (
					ttrss_feeds.update_interval > 0
					AND ttrss_feeds.last_updated < NOW() - CAST((ttrss_feeds.update_interval || ' minutes') AS INTERVAL)
				) OR (
					ttrss_feeds.update_interval >= 0
					AND (last_updated = '1970-01-01 00:00:00' OR last_updated IS NULL)
				))";
		} else {
			$update_limit_qpart = "AND ((
					ttrss_feeds.update_interval = 0
					AND ttrss_feeds.last_updated < DATE_SUB(NOW(), INTERVAL CONVERT(ttrss_user_prefs.value, SIGNED INTEGER) MINUTE)
				) OR (
					ttrss_feeds.update_interval > 0
					AND ttrss_feeds.last_updated < DATE_SUB(NOW(), INTERVAL ttrss_feeds.update_interval MINUTE)
				) OR (
					ttrss_feeds.update_interval >= 0
					AND (last_updated = '1970-01-01 00:00:00' OR last_updated IS NULL)
				))";
		}

		// Test if feed is currently being updated by another process.
		if (DB_TYPE == "pgsql") {
			$updstart_thresh_qpart = "AND (ttrss_feeds.last_update_started IS NULL OR ttrss_feeds.last_update_started < NOW() - INTERVAL '5 minutes')";
		} else {
			$updstart_thresh_qpart = "AND (ttrss_feeds.last_update_started IS NULL OR ttrss_feeds.last_update_started < DATE_SUB(NOW(), INTERVAL 5 MINUTE))";
		}

		$random_qpart = Db::sql_random_function();

		$pdo = Db::pdo();

		// we could be invoked from public.php with no active session
		if ($_SESSION["uid"]) {
			$owner_check_qpart = "AND ttrss_feeds.owner_uid = ".$pdo->quote($_SESSION["uid"]);
		} else {
			$owner_check_qpart = "";
		}

		// We search for feed needing update.
		$res = $pdo->query("SELECT ttrss_feeds.feed_url,ttrss_feeds.id
			FROM
				ttrss_feeds, ttrss_users, ttrss_user_prefs
			WHERE
				ttrss_feeds.owner_uid = ttrss_users.id
				AND ttrss_users.id = ttrss_user_prefs.owner_uid
				AND ttrss_user_prefs.pref_name = 'DEFAULT_UPDATE_INTERVAL'
				$owner_check_qpart
				$update_limit_qpart
				$updstart_thresh_qpart
			ORDER BY $random_qpart LIMIT 30");

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
		Article::purge_orphans();
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

	function getlinktitlebyid() {
		$id = clean($_REQUEST['id']);

		$sth = $this->pdo->prepare("SELECT link, title FROM ttrss_entries, ttrss_user_entries
			WHERE ref_id = ? AND ref_id = id AND owner_uid = ?");
		$sth->execute([$id, $_SESSION['uid']]);

		if ($row = $sth->fetch()) {
			$link = $row['link'];
			$title = $row['title'];

			echo json_encode(array("link" => $link, "title" => $title));
		} else {
			echo json_encode(array("error" => "ARTICLE_NOT_FOUND"));
		}
	}

	function log() {
		$msg = clean($_REQUEST['msg']);
		$file = basename(clean($_REQUEST['file']));
		$line = (int) clean($_REQUEST['line']);
		$context = clean($_REQUEST['context']);

		if ($msg) {
			Logger::get()->log_error(E_USER_WARNING,
				$msg, 'client-js:' . $file, $line, $context);

			echo json_encode(array("message" => "HOST_ERROR_LOGGED"));
		} else {
			echo json_encode(array("error" => "MESSAGE_NOT_FOUND"));
		}

	}

	function checkforupdates() {
		$rv = [];

		$git_timestamp = false;
		$git_commit = false;

		get_version($git_commit, $git_timestamp);

		if (defined('CHECK_FOR_UPDATES') && CHECK_FOR_UPDATES && $_SESSION["access_level"] >= 10 && $git_timestamp) {
			$content = @UrlHelper::fetch(["url" => "https://tt-rss.org/version.json"]);

			if ($content) {
				$content = json_decode($content, true);

				if ($content && isset($content["changeset"])) {
					if ($git_timestamp < (int)$content["changeset"]["timestamp"] &&
						$git_commit != $content["changeset"]["id"]) {

						$rv = $content["changeset"];
					}
				}
			}
		}

		print json_encode($rv);
	}

	private function make_init_params() {
		$params = array();

		foreach (array("ON_CATCHUP_SHOW_NEXT_FEED", "HIDE_READ_FEEDS",
					 "ENABLE_FEED_CATS", "FEEDS_SORT_BY_UNREAD", "CONFIRM_FEED_CATCHUP",
					 "CDM_AUTO_CATCHUP", "FRESH_ARTICLE_MAX_AGE",
					 "HIDE_READ_SHOWS_SPECIAL", "COMBINED_DISPLAY_MODE") as $param) {

			$params[strtolower($param)] = (int) get_pref($param);
		}

		$params["check_for_updates"] = CHECK_FOR_UPDATES;
		$params["icons_url"] = ICONS_URL;
		$params["cookie_lifetime"] = SESSION_COOKIE_LIFETIME;
		$params["default_view_mode"] = get_pref("_DEFAULT_VIEW_MODE");
		$params["default_view_limit"] = (int) get_pref("_DEFAULT_VIEW_LIMIT");
		$params["default_view_order_by"] = get_pref("_DEFAULT_VIEW_ORDER_BY");
		$params["bw_limit"] = (int) $_SESSION["bw_limit"];
		$params["is_default_pw"] = Pref_Prefs::isdefaultpassword();
		$params["label_base_index"] = (int) LABEL_BASE_INDEX;

		$theme = get_pref( "USER_CSS_THEME", false, false);
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

		$params["self_url_prefix"] = get_self_url_prefix();
		$params["max_feed_id"] = (int) $max_feed_id;
		$params["num_feeds"] = (int) $num_feeds;

		$params["hotkeys"] = $this->get_hotkeys_map();

		$params["widescreen"] = (int) $_COOKIE["ttrss_widescreen"];

		$params['simple_update'] = defined('SIMPLE_UPDATE_MODE') && SIMPLE_UPDATE_MODE;

		$params["icon_indicator_white"] = $this->image_to_base64("images/indicator_white.gif");

		$params["labels"] = Labels::get_all_labels($_SESSION["uid"]);

		return $params;
	}

	private function image_to_base64($filename) {
		if (file_exists($filename)) {
			$ext = pathinfo($filename, PATHINFO_EXTENSION);

			return "data:image/$ext;base64," . base64_encode(file_get_contents($filename));
		} else {
			return "";
		}
	}

	static function make_runtime_info() {
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
		$data['cdm_expanded'] = get_pref('CDM_EXPANDED');
		$data["labels"] = Labels::get_all_labels($_SESSION["uid"]);

		if (LOG_DESTINATION == 'sql' && $_SESSION['access_level'] >= 10) {
			if (DB_TYPE == 'pgsql') {
				$log_interval = "created_at > NOW() - interval '1 hour'";
			} else {
				$log_interval = "created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
			}

			$sth = $pdo->prepare("SELECT COUNT(id) AS cid FROM ttrss_error_log WHERE errno != 1024 AND $log_interval");
			$sth->execute();

			if ($row = $sth->fetch()) {
				$data['recent_log_events'] = $row['cid'];
			}
		}

		if (file_exists(LOCK_DIRECTORY . "/update_daemon.lock")) {

			$data['daemon_is_running'] = (int) file_is_locked("update_daemon.lock");

			if (time() - $_SESSION["daemon_stamp_check"] > 30) {

				$stamp = (int) @file_get_contents(LOCK_DIRECTORY . "/update_daemon.stamp");

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
				"goto_tagcloud" => __("Tag cloud"),
				"goto_prefs" => __("Preferences")),
			__("Other") => array(
				"create_label" => __("Create label"),
				"create_filter" => __("Create filter"),
				"collapse_sidebar" => __("Un/collapse sidebar"),
				"help_dialog" => __("Show help dialog"))
		);

		foreach (PluginHost::getInstance()->get_hooks(PluginHost::HOOK_HOTKEY_INFO) as $plugin) {
			$hotkeys = $plugin->hook_hotkey_info($hotkeys);
		}

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
			"f D" => "feed_debug_update",
			"f G" => "feed_debug_viewfeed",
			"f C" => "toggle_combined_mode",
			"f c" => "toggle_cdm_expanded",
			"Q" => "catchup_all",
			"x" => "cat_toggle_collapse",
			"g a" => "goto_all",
			"g f" => "goto_fresh",
			"g s" => "goto_marked",
			"g p" => "goto_published",
			"g r" => "goto_read",
			"g t" => "goto_tagcloud",
			"g P" => "goto_prefs",
			"r" => "select_article_cursor",
			"c l" => "create_label",
			"c f" => "create_filter",
			"c s" => "collapse_sidebar",
			"?" => "help_dialog",
		);

		foreach (PluginHost::getInstance()->get_hooks(PluginHost::HOOK_HOTKEY_MAP) as $plugin) {
			$hotkeys = $plugin->hook_hotkey_map($hotkeys);
		}

		$prefixes = array();

		foreach (array_keys($hotkeys) as $hotkey) {
			$pair = explode(" ", $hotkey, 2);

			if (count($pair) > 1 && !in_array($pair[0], $prefixes)) {
				array_push($prefixes, $pair[0]);
			}
		}

		return array($prefixes, $hotkeys);
	}

}
