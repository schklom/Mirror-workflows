<?php
class RSSUtils {
	static function calculate_article_hash($article, $pluginhost) {
		$tmp = "";

		$ignored_fields = [ "feed", "guid", "guid_hashed", "owner_uid", "force_catchup" ];

		foreach ($article as $k => $v) {
			if (in_array($k, $ignored_fields))
				continue;

			if ($k != "feed" && isset($v)) {
				$x = strip_tags(
					is_array($v) ? implode(",", array_keys($v)) : $v);

				$tmp .= sha1("$k:" . sha1($x));
			}
		}

		return sha1(implode(",", $pluginhost->get_plugin_names()) . $tmp);
	}

	// Strips utf8mb4 characters (i.e. emoji) for mysql
	static function strip_utf8mb4(string $str) {
		return preg_replace('/[\x{10000}-\x{10FFFF}]/u', "\xEF\xBF\xBD", $str);
	}

	static function cleanup_feed_browser() {
		$pdo = Db::pdo();
		$pdo->query("DELETE FROM ttrss_feedbrowser_cache");
	}

	static function cleanup_feed_icons() {
		$pdo = Db::pdo();
		$sth = $pdo->prepare("SELECT id FROM ttrss_feeds WHERE id = ?");

		// check icon files once every Config::get(Config::CACHE_MAX_DAYS) days
		$icon_files = array_filter(glob(Config::get(Config::ICONS_DIR) . "/*.ico"),
			function($f) { return filemtime($f) < time() - 86400 * Config::get(Config::CACHE_MAX_DAYS); });

		foreach ($icon_files as $icon) {
			$feed_id = basename($icon, ".ico");

			$sth->execute([$feed_id]);

			if ($sth->fetch()) {
				@touch($icon);
			} else {
				Debug::log("Removing orphaned feed icon: $icon");
				unlink($icon);
			}
		}
	}

	static function update_daemon_common(int $limit = 0, array $options = []) {
		if (!$limit) $limit = Config::get(Config::DAEMON_FEED_LIMIT);

		if (Config::get_schema_version() != Config::SCHEMA_VERSION) {
			die("Schema version is wrong, please upgrade the database.\n");
		}

		$pdo = Db::pdo();

		if (!Config::get(Config::SINGLE_USER_MODE) && Config::get(Config::DAEMON_UPDATE_LOGIN_LIMIT) > 0) {
			$login_limit = (int) Config::get(Config::DAEMON_UPDATE_LOGIN_LIMIT);

			if (Config::get(Config::DB_TYPE) == "pgsql") {
				$login_thresh_qpart = "AND last_login >= NOW() - INTERVAL '$login_limit days'";
			} else {
				$login_thresh_qpart = "AND last_login >= DATE_SUB(NOW(), INTERVAL $login_limit DAY)";
			}
		} else {
			$login_thresh_qpart = "";
		}

		$default_interval = (int) Prefs::get_default(Prefs::DEFAULT_UPDATE_INTERVAL);

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
			$updstart_thresh_qpart = "AND (last_update_started IS NULL OR last_update_started < NOW() - INTERVAL '10 minutes')";
		} else {
			$updstart_thresh_qpart = "AND (last_update_started IS NULL OR last_update_started < DATE_SUB(NOW(), INTERVAL 10 MINUTE))";
		}

		$query_limit = $limit ? sprintf("LIMIT %d", $limit) : "";

		// Update the least recently updated feeds first
		$query_order = "ORDER BY last_updated";

		if (Config::get(Config::DB_TYPE) == "pgsql")
			$query_order .= " NULLS FIRST";

		$query = "SELECT f.feed_url, f.last_updated
			FROM
				ttrss_feeds f, ttrss_users u LEFT JOIN ttrss_user_prefs2 p ON
					(p.owner_uid = u.id AND profile IS NULL AND pref_name = 'DEFAULT_UPDATE_INTERVAL')
			WHERE
				f.owner_uid = u.id
				$login_thresh_qpart
				$update_limit_qpart
				$updstart_thresh_qpart
				$query_order $query_limit";

		//print "$query\n";

		$res = $pdo->query($query);

		$feeds_to_update = array();
		while ($line = $res->fetch()) {
			array_push($feeds_to_update, $line['feed_url']);
		}

		Debug::log(sprintf("Scheduled %d feeds to update...", count($feeds_to_update)));

		// Update last_update_started before actually starting the batch
		// in order to minimize collision risk for parallel daemon tasks
		if (count($feeds_to_update) > 0) {
			$feeds_qmarks = arr_qmarks($feeds_to_update);

			$tmph = $pdo->prepare("UPDATE ttrss_feeds SET last_update_started = NOW()
				WHERE feed_url IN ($feeds_qmarks)");
			$tmph->execute($feeds_to_update);
		}

		$nf = 0;
		$bstarted = microtime(true);

		$batch_owners = [];

		$user_query = "SELECT f.id,
				last_updated,
				f.owner_uid,
				u.login AS owner,
				f.title
			FROM ttrss_feeds f, ttrss_users u LEFT JOIN ttrss_user_prefs2 p ON
					(p.owner_uid = u.id AND profile IS NULL AND pref_name = 'DEFAULT_UPDATE_INTERVAL')
			WHERE
				f.owner_uid = u.id
				AND feed_url = :feed
				$login_thresh_qpart
				$update_limit_qpart
			ORDER BY f.id $query_limit";

		//print "$user_query\n";

		// since we have feed xml cached, we can deal with other feeds with the same url
		$usth = $pdo->prepare($user_query);

		foreach ($feeds_to_update as $feed) {
			Debug::log("Base feed: $feed");

			$usth->execute(["feed" => $feed]);

			if ($tline = $usth->fetch()) {
				Debug::log(sprintf("=> %s (ID: %d, U: %s [%d]), last updated: %s", $tline["title"], $tline["id"],
					$tline["owner"], $tline["owner_uid"],
					$tline["last_updated"] ? $tline["last_updated"] : "never"));

				if (!in_array($tline["owner_uid"], $batch_owners))
					array_push($batch_owners, $tline["owner_uid"]);

				$fstarted = microtime(true);

				$quiet = (isset($options["quiet"])) ? "--quiet" : "";
				$log = function_exists("flock") && isset($options['log']) ? '--log '.$options['log'] : '';
				$log_level = isset($options['log-level']) ? '--log-level '.$options['log-level'] : '';

				/* shared hosting may have this disabled and it's not strictly required */
				if (self::function_enabled('passthru')) {
					$exit_code = 0;

					passthru(Config::get(Config::PHP_EXECUTABLE) . " update.php --update-feed " . $tline["id"] . " --pidlock feed-" . $tline["id"] . " $quiet $log $log_level", $exit_code);

					Debug::log(sprintf("<= %.4f (sec) exit code: %d", microtime(true) - $fstarted, $exit_code));

					// -1 can be caused by a SIGCHLD handler which daemon master process installs (not every setup, apparently)
					if ($exit_code != 0 && $exit_code != -1) {
						$festh = $pdo->prepare("SELECT last_error FROM ttrss_feeds WHERE id = ?");
						$festh->execute([$tline["id"]]);

						if ($ferow = $festh->fetch()) {
							$error_message = $ferow["last_error"];
						} else {
							$error_message = "N/A";
						}

						Debug::log("!! Last error: $error_message");

						Logger::log(E_USER_NOTICE,
							sprintf("Update process for feed %d (%s, owner UID: %d) failed with exit code: %d (%s).",
								$tline["id"], clean($tline["title"]), $tline["owner_uid"], $exit_code, clean($error_message)));

						$combined_error_message = sprintf("Update process failed with exit code: %d (%s)",
							$exit_code, clean($error_message));

						# mark failed feed as having an update error (unless it is already marked)
						$fusth = $pdo->prepare("UPDATE ttrss_feeds SET last_error = ? WHERE id = ? AND last_error = ''");
						$fusth->execute([$combined_error_message, $tline["id"]]);
					}

				} else {
					try {
						if (!self::update_rss_feed($tline["id"], true)) {
							Logger::log(E_USER_NOTICE,
								sprintf("Update request for feed %d (%s, owner UID: %d) failed: %s.",
									$tline["id"], clean($tline["title"]), $tline["owner_uid"], clean(UrlHelper::$fetch_last_error)));
						}

						Debug::log(sprintf("<= %.4f (sec) (not using a separate process)", microtime(true) - $fstarted));

					} catch (PDOException $e) {
						Logger::log_error(E_USER_WARNING, $e->getMessage(), $e->getFile(), $e->getLine(), $e->getTraceAsString());

						try {
							$pdo->rollback();
						} catch (PDOException $e) {
							// it doesn't matter if there wasn't actually anything to rollback, PDO Exception can be
							// thrown outside of an active transaction during feed update
						}
					}
				}

				++$nf;
			}
		}

		if ($nf > 0) {
			Debug::log(sprintf("Processed %d feeds in %.4f (sec), %.4f (sec/feed avg)", $nf,
				microtime(true) - $bstarted, (microtime(true) - $bstarted) / $nf));
		}

		foreach ($batch_owners as $owner_uid) {
			Debug::log("Running housekeeping tasks for user $owner_uid...");

			self::housekeeping_user($owner_uid);
		}

		// Send feed digests by email if needed.
		Digest::send_headlines_digests();

		return $nf;
	}

	/** this is used when subscribing; TODO: update to ORM */
	static function update_basic_info(int $feed) {

		$pdo = Db::pdo();

		$sth = $pdo->prepare("SELECT owner_uid,feed_url,auth_pass,auth_login
				FROM ttrss_feeds WHERE id = ?");
		$sth->execute([$feed]);

		if ($row = $sth->fetch()) {

			$owner_uid = $row["owner_uid"];
			$auth_login = $row["auth_login"];
			$auth_pass = $row["auth_pass"];
			$fetch_url = $row["feed_url"];

			$pluginhost = new PluginHost();
			$user_plugins = get_pref(Prefs::_ENABLED_PLUGINS, $owner_uid);

			$pluginhost->load(Config::get(Config::PLUGINS), PluginHost::KIND_ALL);
			$pluginhost->load((string)$user_plugins, PluginHost::KIND_USER, $owner_uid);
			//$pluginhost->load_data();

			$basic_info = [];

			$pluginhost->run_hooks_callback(PluginHost::HOOK_FEED_BASIC_INFO, function ($result) use (&$basic_info) {
				$basic_info = $result;
			}, $basic_info, $fetch_url, $owner_uid, $feed, $auth_login, $auth_pass);

			if (!$basic_info) {
				$feed_data = UrlHelper::fetch($fetch_url, false,
					$auth_login, $auth_pass, false,
					Config::get(Config::FEED_FETCH_TIMEOUT),
					0);

				$feed_data = trim($feed_data);

				$rss = new FeedParser($feed_data);
				$rss->init();

				if (!$rss->error()) {
					$basic_info = array(
						'title' => mb_substr(clean($rss->get_title()), 0, 199),
						'site_url' => mb_substr(rewrite_relative_url($fetch_url, clean($rss->get_link())), 0, 245)
					);
				}
			}

			if ($basic_info && is_array($basic_info)) {
				$sth = $pdo->prepare("SELECT title, site_url FROM ttrss_feeds WHERE id = ?");
				$sth->execute([$feed]);

				if ($row = $sth->fetch()) {

					$registered_title = $row["title"];
					$orig_site_url = $row["site_url"];

					if ($basic_info['title'] && (!$registered_title || $registered_title == "[Unknown]")) {

						$sth = $pdo->prepare("UPDATE ttrss_feeds SET
							title = ? WHERE id = ?");
						$sth->execute([$basic_info['title'], $feed]);
					}

					if ($basic_info['site_url'] && $orig_site_url != $basic_info['site_url']) {
						$sth = $pdo->prepare("UPDATE ttrss_feeds SET
							site_url = ? WHERE id = ?");
						$sth->execute([$basic_info['site_url'], $feed]);
					}

				}
			}
		}
	}

	static function update_rss_feed(int $feed, bool $no_cache = false) : bool {

		Debug::log("start", Debug::LOG_VERBOSE);

		$pdo = Db::pdo();

		if (Config::get(Config::DB_TYPE) == "pgsql") {
			$favicon_interval_qpart = "favicon_last_checked < NOW() - INTERVAL '12 hour'";
		} else {
			$favicon_interval_qpart = "favicon_last_checked < DATE_SUB(NOW(), INTERVAL 12 HOUR)";
		}

		$feed_obj = ORM::for_table('ttrss_feeds')
				->select_expr("ttrss_feeds.*,
					".SUBSTRING_FOR_DATE."(last_unconditional, 1, 19) AS last_unconditional,
					(favicon_is_custom IS NOT TRUE AND
						(favicon_last_checked IS NULL OR $favicon_interval_qpart)) AS favicon_needs_check")
				->find_one($feed);

		if ($feed_obj) {
			$feed_obj->last_update_started = Db::NOW();
			$feed_obj->save();

			$feed_language = mb_strtolower($feed_obj->feed_language);

			if (!$feed_language) $feed_language = mb_strtolower(get_pref(Prefs::DEFAULT_SEARCH_LANGUAGE, $feed_obj->owner_uid));
			if (!$feed_language) $feed_language = 'simple';

		} else {
			Debug::log("error: feeds table record not found for feed: $feed");
			return false;
		}

		// feed was batch-subscribed or something, we need to get basic info
		// this is not optimal currently as it fetches stuff separately TODO: optimize
		if ($feed_obj->title == "[Unknown]" || empty($feed_obj->title) || empty($feed_obj->site_url)) {
			Debug::log("setting basic feed info for $feed...");
			self::update_basic_info($feed);
		}

		$date_feed_processed = date('Y-m-d H:i');

		$cache_filename = Config::get(Config::CACHE_DIR) . "/feeds/" . sha1($feed_obj->feed_url) . ".xml";

		$pluginhost = new PluginHost();
		$user_plugins = get_pref(Prefs::_ENABLED_PLUGINS, $feed_obj->owner_uid);

		$pluginhost->load(Config::get(Config::PLUGINS), PluginHost::KIND_ALL);
		$pluginhost->load((string)$user_plugins, PluginHost::KIND_USER, $feed_obj->owner_uid);

		$rss_hash = false;

		$force_refetch = isset($_REQUEST["force_refetch"]);
		$feed_data = "";

		Debug::log("running HOOK_FETCH_FEED handlers...", Debug::LOG_VERBOSE);

		$start_ts = microtime(true);
		$last_article_timestamp = 0;

		$hff_owner_uid = $feed_obj->owner_uid;
		$hff_feed_url = $feed_obj->feed_url;

		$pluginhost->chain_hooks_callback(PluginHost::HOOK_FETCH_FEED,
			function ($result, $plugin) use (&$feed_data, $start_ts) {
				$feed_data = $result;
				Debug::log(sprintf("=== %.4f (sec) %s", microtime(true) - $start_ts, get_class($plugin)), Debug::LOG_VERBOSE);
			},
			$feed_data, $hff_feed_url, $hff_owner_uid, $feed, $last_article_timestamp, $auth_login, $auth_pass);

		if ($feed_data) {
			Debug::log("feed data has been modified by a plugin.", Debug::LOG_VERBOSE);
		} else {
			Debug::log("feed data has not been modified by a plugin.", Debug::LOG_VERBOSE);
		}

		// try cache
		if (!$feed_data &&
			is_readable($cache_filename) &&
			!$feed_obj->auth_login && !$feed_obj->auth_pass &&
			filemtime($cache_filename) > time() - 30) {

			Debug::log("using local cache: {$cache_filename}.", Debug::LOG_VERBOSE);

			$feed_data = file_get_contents($cache_filename);

			if ($feed_data) {
				$rss_hash = sha1($feed_data);
			}

		} else {
			Debug::log("local cache will not be used for this feed", Debug::LOG_VERBOSE);
		}

		// fetch feed from source
		if (!$feed_data) {
			Debug::log("last unconditional update request: {$feed_obj->last_unconditional}", Debug::LOG_VERBOSE);

			if (ini_get("open_basedir") && function_exists("curl_init")) {
				Debug::log("not using CURL due to open_basedir restrictions", Debug::LOG_VERBOSE);
			}

			if (time() - strtotime($feed_obj->last_unconditional) > Config::get(Config::MAX_CONDITIONAL_INTERVAL)) {
				Debug::log("maximum allowed interval for conditional requests exceeded, forcing refetch", Debug::LOG_VERBOSE);

				$force_refetch = true;
			} else {
				Debug::log("stored last modified for conditional request: {$feed_obj->last_modified}", Debug::LOG_VERBOSE);
			}

			Debug::log("fetching {$feed_obj->feed_url} (force_refetch: $force_refetch)...", Debug::LOG_VERBOSE);

			$feed_data = UrlHelper::fetch([
				"url" => $feed_obj->feed_url,
				"login" => $feed_obj->auth_login,
				"pass" => $feed_obj->auth_pass,
				"timeout" => $no_cache ? Config::get(Config::FEED_FETCH_NO_CACHE_TIMEOUT) : Config::get(Config::FEED_FETCH_TIMEOUT),
				"last_modified" => $force_refetch ? "" : $feed_obj->last_modified
			]);

			$feed_data = trim($feed_data);

			Debug::log("fetch done.", Debug::LOG_VERBOSE);
			Debug::log(sprintf("effective URL (after redirects): %s (IP: %s) ", UrlHelper::$fetch_effective_url, UrlHelper::$fetch_effective_ip_addr), Debug::LOG_VERBOSE);
			Debug::log("server last modified: " . UrlHelper::$fetch_last_modified, Debug::LOG_VERBOSE);

			if ($feed_data && UrlHelper::$fetch_last_modified != $feed_obj->last_modified) {
				$feed_obj->last_modified = substr(UrlHelper::$fetch_last_modified, 0, 245);
				$feed_obj->save();
			}

			// cache vanilla feed data for re-use
			if ($feed_data && !$feed_obj->auth_pass && !$feed_obj->auth_login && is_writable(Config::get(Config::CACHE_DIR) . "/feeds")) {
				$new_rss_hash = sha1($feed_data);

				if ($new_rss_hash != $rss_hash) {
					Debug::log("saving to local cache: $cache_filename", Debug::LOG_VERBOSE);
					file_put_contents($cache_filename, $feed_data);
				}
			}
		}

		if (!$feed_data) {
			Debug::log(sprintf("unable to fetch: %s [%s]", UrlHelper::$fetch_last_error, UrlHelper::$fetch_last_error_code), Debug::LOG_VERBOSE);

			// If-Modified-Since
			if (UrlHelper::$fetch_last_error_code == 304) {
				Debug::log("source claims data not modified, nothing to do.", Debug::LOG_VERBOSE);
				$error_message = "";

				$feed_obj->set([
					'last_error' => '',
					'last_successful_update' => Db::NOW(),
					'last_updated' => Db::NOW(),
				]);

				$feed_obj->save();

			} else {
				$error_message = UrlHelper::$fetch_last_error;

				$feed_obj->set([
					'last_error' => $error_message,
					'last_updated' => Db::NOW(),
				]);

				$feed_obj->save();
			}

			return $error_message == "";
		}

		Debug::log("running HOOK_FEED_FETCHED handlers...", Debug::LOG_VERBOSE);
		$feed_data_checksum = md5($feed_data);

		// because chain_hooks_callback() accepts variables by value
		$pff_owner_uid = $feed_obj->owner_uid;
		$pff_feed_url = $feed_obj->feed_url;

		$start_ts = microtime(true);
		$pluginhost->chain_hooks_callback(PluginHost::HOOK_FEED_FETCHED,
			function ($result, $plugin) use (&$feed_data, $start_ts) {
				$feed_data = $result;
				Debug::log(sprintf("=== %.4f (sec) %s", microtime(true) - $start_ts, get_class($plugin)), Debug::LOG_VERBOSE);
			},
			$feed_data, $pff_feed_url, $pff_owner_uid, $feed);

		if (md5($feed_data) != $feed_data_checksum) {
			Debug::log("feed data has been modified by a plugin.", Debug::LOG_VERBOSE);
		} else {
			Debug::log("feed data has not been modified by a plugin.", Debug::LOG_VERBOSE);
		}

		$rss = new FeedParser($feed_data);
		$rss->init();

		if (!$rss->error()) {

			Debug::log("running HOOK_FEED_PARSED handlers...", Debug::LOG_VERBOSE);

			// We use local pluginhost here because we need to load different per-user feed plugins

			$start_ts = microtime(true);
			$pluginhost->chain_hooks_callback(PluginHost::HOOK_FEED_PARSED,
				function($result, $plugin) use ($start_ts) {
					Debug::log(sprintf("=== %.4f (sec) %s", microtime(true) - $start_ts, get_class($plugin)), Debug::LOG_VERBOSE);
				},
				$rss, $feed);

			Debug::log("language: $feed_language", Debug::LOG_VERBOSE);
			Debug::log("processing feed data...", Debug::LOG_VERBOSE);

			$site_url = mb_substr(rewrite_relative_url($feed_obj->feed_url, clean($rss->get_link())), 0, 245);

			Debug::log("site_url: $site_url", Debug::LOG_VERBOSE);
			Debug::log("feed_title: {$rss->get_title()}", Debug::LOG_VERBOSE);

			Debug::log("favicon: needs check: {$feed_obj->favicon_needs_check} is custom: {$feed_obj->favicon_is_custom} avg color: {$feed_obj->favicon_avg_color}",
				Debug::LOG_VERBOSE);

			if ($feed_obj->favicon_needs_check || $force_refetch) {

				/* terrible hack: if we crash on floicon shit here, we won't check
				 * the icon avgcolor again (unless the icon got updated) */

				$favicon_file = Config::get(Config::ICONS_DIR) . "/$feed.ico";
				$favicon_modified = file_exists($favicon_file) ? filemtime($favicon_file) : -1;

				if (!$feed_obj->favicon_is_custom) {
					Debug::log("favicon: trying to update favicon...", Debug::LOG_VERBOSE);
					self::update_favicon($site_url, $feed);

					if ((file_exists($favicon_file) ? filemtime($favicon_file) : -1) > $favicon_modified)
						$feed_obj->favicon_avg_color = null;
				}

				if (is_readable($favicon_file) && function_exists("imagecreatefromstring") && empty($feed_obj->favicon_avg_color)) {
					require_once "colors.php";

					Debug::log("favicon: trying to calculate average color...", Debug::LOG_VERBOSE);

					$feed_obj->favicon_avg_color = 'fail';
					$feed_obj->save();

					$feed_obj->favicon_avg_color = \Colors\calculate_avg_color($favicon_file);
					$feed_obj->save();

					Debug::log("favicon: avg color: {$feed_obj->favicon_avg_color}", Debug::LOG_VERBOSE);

				} else if ($feed_obj->favicon_avg_color == 'fail') {
					Debug::log("floicon failed $favicon_file, not trying to recalculate avg color", Debug::LOG_VERBOSE);
				}
			}

			Debug::log("loading filters & labels...", Debug::LOG_VERBOSE);

			$filters = self::load_filters($feed, $feed_obj->owner_uid);

			if (Debug::get_loglevel() >= Debug::LOG_EXTENDED) {
				print_r($filters);
			}

			Debug::log("" . count($filters) . " filters loaded.", Debug::LOG_VERBOSE);

			$items = $rss->get_items();

			if (!is_array($items)) {
				Debug::log("no articles found.", Debug::LOG_VERBOSE);

				$feed_obj->set([
					'last_updated' => Db::NOW(),
					'last_unconditional' => Db::NOW(),
					'last_error' => '',
				]);

				$feed_obj->save();

				return true; // no articles
			}

			Debug::log("processing articles...", Debug::LOG_VERBOSE);

			$tstart = time();

			foreach ($items as $item) {
				$pdo->beginTransaction();

				Debug::log("=================================================================================================================================",
					Debug::LOG_VERBOSE);

				if (Debug::get_loglevel() >= 3) {
					print_r($item);
				}

				if (ini_get("max_execution_time") > 0 && time() - $tstart >= ini_get("max_execution_time") * 0.7) {
					Debug::log("looks like there's too many articles to process at once, breaking out.", Debug::LOG_VERBOSE);
					$pdo->commit();
					break;
				}

				$entry_guid = strip_tags($item->get_id());
				if (!$entry_guid) $entry_guid = strip_tags($item->get_link());
				if (!$entry_guid) $entry_guid = self::make_guid_from_title($item->get_title());

				if (!$entry_guid) {
					$pdo->commit();
					continue;
				}

				$entry_guid_hashed_compat = 'SHA1:' . sha1("{$feed_obj->owner_uid},$entry_guid");
				$entry_guid_hashed = json_encode(["ver" => 2, "uid" => $feed_obj->owner_uid, "hash" => 'SHA1:' . sha1($entry_guid)]);
				$entry_guid = "$feed_obj->owner_uid,$entry_guid";

				Debug::log("guid $entry_guid (hash: $entry_guid_hashed compat: $entry_guid_hashed_compat)", Debug::LOG_VERBOSE);

				$entry_timestamp = (int)$item->get_date();

				Debug::log(sprintf("orig date: %s (%s)", $item->get_date(), date("Y-m-d H:i:s", $item->get_date())),
					Debug::LOG_VERBOSE);

				$entry_title = strip_tags($item->get_title());

				$entry_link = rewrite_relative_url($site_url, clean($item->get_link()));

				$entry_language = mb_substr(trim($item->get_language()), 0, 2);

				Debug::log("title $entry_title", Debug::LOG_VERBOSE);
				Debug::log("link $entry_link", Debug::LOG_VERBOSE);
				Debug::log("language $entry_language", Debug::LOG_VERBOSE);

				if (!$entry_title) $entry_title = date("Y-m-d H:i:s", $entry_timestamp);;

				$entry_content = $item->get_content();
				if (!$entry_content) $entry_content = $item->get_description();

				if (Debug::get_loglevel() >= 3) {
					print "content: ";
					print htmlspecialchars($entry_content);
					print "\n";
				}

				$entry_comments = mb_substr(strip_tags($item->get_comments_url()), 0, 245);
				$num_comments = (int) $item->get_comments_count();

				$entry_author = strip_tags($item->get_author());
				$entry_guid = mb_substr($entry_guid, 0, 245);

				Debug::log("author $entry_author", Debug::LOG_VERBOSE);
				Debug::log("looking for tags...", Debug::LOG_VERBOSE);

				$entry_tags = $item->get_categories();
				Debug::log("tags found: " . join(", ", $entry_tags), Debug::LOG_VERBOSE);

				Debug::log("done collecting data.", Debug::LOG_VERBOSE);

				$sth = $pdo->prepare("SELECT id, content_hash, lang FROM ttrss_entries
					WHERE guid IN (?, ?, ?)");
				$sth->execute([$entry_guid, $entry_guid_hashed, $entry_guid_hashed_compat]);

				if ($row = $sth->fetch()) {
					$base_entry_id = $row["id"];
					$entry_stored_hash = $row["content_hash"];
					$article_labels = Article::_get_labels($base_entry_id, $feed_obj->owner_uid);

					$existing_tags = Article::_get_tags($base_entry_id, $feed_obj->owner_uid);
					$entry_tags = array_unique(array_merge($entry_tags, $existing_tags));
				} else {
					$base_entry_id = false;
					$entry_stored_hash = "";
					$article_labels = array();
				}

				Debug::log("looking for enclosures...", Debug::LOG_VERBOSE);

				// enclosures

				$enclosures = array();

				$encs = $item->get_enclosures();

				if (is_array($encs)) {
					foreach ($encs as $e) {

						$pluginhost->chain_hooks_callback(PluginHost::HOOK_ENCLOSURE_IMPORTED,
							function ($result) use (&$e) {
								$e = $result;
							},
							$e, $feed);

						$e_item = array(
							rewrite_relative_url($site_url, $e->link),
							$e->type, $e->length, $e->title, $e->width, $e->height);

						// Yet another episode of "mysql utf8_general_ci is gimped"
						if (Config::get(Config::DB_TYPE) == "mysql" && Config::get(Config::MYSQL_CHARSET) != "UTF8MB4") {
							for ($i = 0; $i < count($e_item); $i++) {
								if (is_string($e_item[$i])) {
									$e_item[$i] = self::strip_utf8mb4($e_item[$i]);
								}
							}
						}

						array_push($enclosures, $e_item);
					}
				}

				$article = array("owner_uid" => $feed_obj->owner_uid, // read only
					"guid" => $entry_guid, // read only
					"guid_hashed" => $entry_guid_hashed, // read only
					"title" => $entry_title,
					"content" => $entry_content,
					"link" => $entry_link,
					"labels" => $article_labels, // current limitation: can add labels to article, can't remove them
					"tags" => $entry_tags,
					"author" => $entry_author,
					"force_catchup" => false, // ugly hack for the time being
					"score_modifier" => 0, // no previous value, plugin should recalculate score modifier based on content if needed
					"language" => $entry_language,
					"timestamp" => $entry_timestamp,
					"num_comments" => $num_comments,
					"enclosures" => $enclosures,
					"feed" => array("id" => $feed,
						"fetch_url" => $feed_obj->feed_url,
						"site_url" => $site_url,
						"cache_images" => $feed_obj->cache_images)
				);

				$entry_plugin_data = "";
				$entry_current_hash = self::calculate_article_hash($article, $pluginhost);

				Debug::log("article hash: $entry_current_hash [stored=$entry_stored_hash]", Debug::LOG_VERBOSE);

				if ($entry_current_hash == $entry_stored_hash && !isset($_REQUEST["force_rehash"])) {
					Debug::log("stored article seems up to date [IID: $base_entry_id], updating timestamp only.", Debug::LOG_VERBOSE);

					// we keep encountering the entry in feeds, so we need to
					// update date_updated column so that we don't get horrible
					// dupes when the entry gets purged and reinserted again e.g.
					// in the case of SLOW SLOW OMG SLOW updating feeds

					$entry_obj = ORM::for_table('ttrss_entries')
						->find_one($base_entry_id)
						->set('date_updated', Db::NOW())
						->save();

					$pdo->commit();

					continue;
				}

				Debug::log("hash differs, running HOOK_ARTICLE_FILTER handlers...", Debug::LOG_VERBOSE);

				$start_ts = microtime(true);

				$pluginhost->chain_hooks_callback(PluginHost::HOOK_ARTICLE_FILTER,
					function ($result, $plugin) use (&$article, &$entry_plugin_data, $start_ts) {
						$article = $result;

						$entry_plugin_data .= mb_strtolower(get_class($plugin)) . ",";

						Debug::log(sprintf("=== %.4f (sec) %s", microtime(true) - $start_ts, get_class($plugin)),
							Debug::LOG_VERBOSE);
					},
					$article);

				if (Debug::get_loglevel() >= 3) {
					print "processed content: ";
					print htmlspecialchars($article["content"]);
					print "\n";
				}

				Debug::log("plugin data: {$entry_plugin_data}", Debug::LOG_VERBOSE);

				// Workaround: 4-byte unicode requires utf8mb4 in MySQL. See https://tt-rss.org/forum/viewtopic.php?f=1&t=3377&p=20077#p20077
				if (Config::get(Config::DB_TYPE) == "mysql" && Config::get(Config::MYSQL_CHARSET) != "UTF8MB4") {
					foreach ($article as $k => $v) {
						// i guess we'll have to take the risk of 4byte unicode labels & tags here
						if (is_string($article[$k])) {
							$article[$k] = self::strip_utf8mb4($v);
						}
					}
				}

				/* Collect article tags here so we could filter by them: */

				$matched_rules = [];
				$matched_filters = [];

				$article_filters = self::get_article_filters($filters, $article["title"],
					$article["content"], $article["link"], $article["author"],
					$article["tags"], $matched_rules, $matched_filters);

				// $article_filters should be renamed to something like $filter_actions; actual filter objects are in $matched_filters
				$pluginhost->run_hooks(PluginHost::HOOK_FILTER_TRIGGERED,
					$feed, $feed_obj->owner_uid, $article, $matched_filters, $matched_rules, $article_filters);

				$matched_filter_ids = array_map(function($f) { return $f['id']; }, $matched_filters);

				if (count($matched_filter_ids) > 0) {
					$filter_objs = ORM::for_table('ttrss_filters2')
						->where('owner_uid', $feed_obj->owner_uid)
						->where_in('id', $matched_filter_ids);

					foreach ($filter_objs as $filter_obj) {
						$filter_obj->set('last_triggered', Db::NOW());
						$filter_obj->save();
					}
				}

				if (Debug::get_loglevel() >= Debug::LOG_EXTENDED) {
					Debug::log("matched filters: ", Debug::LOG_VERBOSE);

					if (count($matched_filters) != 0) {
						print_r($matched_filters);
					}

					Debug::log("matched filter rules: ", Debug::LOG_VERBOSE);

					if (count($matched_rules) != 0) {
						print_r($matched_rules);
					}

					Debug::log("filter actions: ", Debug::LOG_VERBOSE);

					if (count($article_filters) != 0) {
						print_r($article_filters);
					}
				}

				$plugin_filter_names = self::find_article_filters($article_filters, "plugin");
				$plugin_filter_actions = $pluginhost->get_filter_actions();

				if (count($plugin_filter_names) > 0) {
					Debug::log("applying plugin filter actions...", Debug::LOG_VERBOSE);

					foreach ($plugin_filter_names as $pfn) {
						list($pfclass,$pfaction) = explode(":", $pfn["param"]);

						if (isset($plugin_filter_actions[$pfclass])) {
							$plugin = $pluginhost->get_plugin($pfclass);

							Debug::log("... $pfclass: $pfaction", Debug::LOG_VERBOSE);

							if ($plugin) {
								$start = microtime(true);
								$article = $plugin->hook_article_filter_action($article, $pfaction);

								Debug::log(sprintf("=== %.4f (sec)", microtime(true) - $start), Debug::LOG_VERBOSE);
							} else {
								Debug::log("??? $pfclass: plugin object not found.", Debug::LOG_VERBOSE);
							}
						} else {
							Debug::log("??? $pfclass: filter plugin not registered.", Debug::LOG_VERBOSE);
						}
					}
				}

				$entry_tags = $article["tags"];
				$entry_title = strip_tags($article["title"]);
				$entry_author = mb_substr(strip_tags($article["author"]), 0, 245);
				$entry_link = strip_tags($article["link"]);
				$entry_content = $article["content"]; // escaped below
				$entry_force_catchup = $article["force_catchup"];
				$article_labels = $article["labels"];
				$entry_score_modifier = (int) $article["score_modifier"];
				$entry_language = $article["language"];
				$entry_timestamp = $article["timestamp"];
				$num_comments = $article["num_comments"];
				$enclosures = $article["enclosures"];

				if ($entry_timestamp == -1 || !$entry_timestamp || $entry_timestamp > time()) {
					$entry_timestamp = time();
				}

				$entry_timestamp_fmt = strftime("%Y/%m/%d %H:%M:%S", $entry_timestamp);

				Debug::log("date: $entry_timestamp ($entry_timestamp_fmt)", Debug::LOG_VERBOSE);
				Debug::log("num_comments: $num_comments", Debug::LOG_VERBOSE);

				if (Debug::get_loglevel() >= Debug::LOG_EXTENDED) {
					Debug::log("article labels:", Debug::LOG_VERBOSE);

					if (count($article_labels) != 0) {
						print_r($article_labels);
					}
				}

				Debug::log("force catchup: $entry_force_catchup", Debug::LOG_VERBOSE);

				if ($feed_obj->cache_images)
					self::cache_media($entry_content, $site_url);

				$csth = $pdo->prepare("SELECT id FROM ttrss_entries
					WHERE guid IN (?, ?, ?)");
				$csth->execute([$entry_guid, $entry_guid_hashed, $entry_guid_hashed_compat]);

				if (!$row = $csth->fetch()) {

					Debug::log("base guid [$entry_guid or $entry_guid_hashed] not found, creating...", Debug::LOG_VERBOSE);

					// base post entry does not exist, create it

					$usth = $pdo->prepare(
						"INSERT INTO ttrss_entries
							(title,
							guid,
							link,
							updated,
							content,
							content_hash,
							no_orig_date,
							date_updated,
							date_entered,
							comments,
							num_comments,
							plugin_data,
							lang,
							author)
						VALUES
							(?, ?, ?, ?, ?, ?,
							false,
							NOW(),
							?, ?, ?, ?,	?, ?)");

						$usth->execute([$entry_title,
							$entry_guid_hashed,
							$entry_link,
							$entry_timestamp_fmt,
							"$entry_content",
							$entry_current_hash,
							$date_feed_processed,
							$entry_comments,
							(int)$num_comments,
							$entry_plugin_data,
							"$entry_language",
							"$entry_author"]);

				}

				$csth->execute([$entry_guid, $entry_guid_hashed, $entry_guid_hashed_compat]);

				$entry_ref_id = 0;
				$entry_int_id = 0;

				if ($row = $csth->fetch()) {

					Debug::log("base guid found, checking for user record", Debug::LOG_VERBOSE);

					$ref_id = $row['id'];
					$entry_ref_id = $ref_id;

					if (self::find_article_filter($article_filters, "filter")) {
						Debug::log("article is filtered out, nothing to do.", Debug::LOG_VERBOSE);
						$pdo->commit();
						continue;
					}

					$score = self::calculate_article_score($article_filters) + $entry_score_modifier;

					Debug::log("initial score: $score [including plugin modifier: $entry_score_modifier]", Debug::LOG_VERBOSE);

					// check for user post link to main table

					$sth = $pdo->prepare("SELECT ref_id, int_id FROM ttrss_user_entries WHERE
							ref_id = ? AND owner_uid = ?");
					$sth->execute([$ref_id, $feed_obj->owner_uid]);

					// okay it doesn't exist - create user entry
					if ($row = $sth->fetch()) {
						$entry_ref_id = $row["ref_id"];
						$entry_int_id = $row["int_id"];

						Debug::log("user record FOUND: RID: $entry_ref_id, IID: $entry_int_id", Debug::LOG_VERBOSE);
					} else {

						Debug::log("user record not found, creating...", Debug::LOG_VERBOSE);

						if ($score >= -500 && !self::find_article_filter($article_filters, 'catchup') && !$entry_force_catchup) {
							$unread = 1;
							$last_read_qpart = null;
						} else {
							$unread = 0;
							$last_read_qpart = date("Y-m-d H:i"); // we can't use NOW() here because it gets quoted
						}

						if (self::find_article_filter($article_filters, 'mark') || $score > 1000) {
							$marked = 1;
						} else {
							$marked = 0;
						}

						if (self::find_article_filter($article_filters, 'publish')) {
							$published = 1;
						} else {
							$published = 0;
						}

						$last_marked = ($marked == 1) ? 'NOW()' : 'NULL';
						$last_published = ($published == 1) ? 'NOW()' : 'NULL';

						$sth = $pdo->prepare(
							"INSERT INTO ttrss_user_entries
								(ref_id, owner_uid, feed_id, unread, last_read, marked,
								published, score, tag_cache, label_cache, uuid,
								last_marked, last_published)
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', '', ".$last_marked.", ".$last_published.")");

						$sth->execute([$ref_id, $feed_obj->owner_uid, $feed, $unread, $last_read_qpart, $marked,
							$published, $score]);

						$sth = $pdo->prepare("SELECT int_id FROM ttrss_user_entries WHERE
								ref_id = ? AND owner_uid = ? AND
								feed_id = ? LIMIT 1");

						$sth->execute([$ref_id, $feed_obj->owner_uid, $feed]);

						if ($row = $sth->fetch())
							$entry_int_id = $row['int_id'];
					}

					Debug::log("resulting RID: $entry_ref_id, IID: $entry_int_id", Debug::LOG_VERBOSE);

					if (Config::get(Config::DB_TYPE) == "pgsql")
						$tsvector_qpart = "tsvector_combined = to_tsvector(:ts_lang, :ts_content),";
					else
						$tsvector_qpart = "";

					$sth = $pdo->prepare("UPDATE ttrss_entries
						SET title = :title,
							$tsvector_qpart
							content = :content,
							content_hash = :content_hash,
							updated = :updated,
							date_updated = NOW(),
							num_comments = :num_comments,
							plugin_data = :plugin_data,
							author = :author,
							lang = :lang
						WHERE id = :id");

					$params = [":title" => $entry_title,
						":content" => "$entry_content",
						":content_hash" => $entry_current_hash,
						":updated" => $entry_timestamp_fmt,
						":num_comments" => (int)$num_comments,
						":plugin_data" => $entry_plugin_data,
						":author" => "$entry_author",
						":lang" => $entry_language,
						":id" => $ref_id];

					if (Config::get(Config::DB_TYPE) == "pgsql") {
						$params[":ts_lang"] = $feed_language;
						$params[":ts_content"] = mb_substr(strip_tags($entry_title . " " . $entry_content), 0, 900000);
					}

					$sth->execute($params);

					// update aux data
					$sth = $pdo->prepare("UPDATE ttrss_user_entries
							SET score = ? WHERE ref_id = ?");
					$sth->execute([$score, $ref_id]);

					if ($feed_obj->mark_unread_on_update &&
						!$entry_force_catchup &&
						!self::find_article_filter($article_filters, 'catchup')) {

						Debug::log("article updated, marking unread as requested.", Debug::LOG_VERBOSE);

						$sth = $pdo->prepare("UPDATE ttrss_user_entries
							SET last_read = null, unread = true WHERE ref_id = ?");
						$sth->execute([$ref_id]);
					} else {
						Debug::log("article updated, but we're forbidden to mark it unread.", Debug::LOG_VERBOSE);
					}
				}

				Debug::log("assigning labels [other]...", Debug::LOG_VERBOSE);

				foreach ($article_labels as $label) {
					Labels::add_article($entry_ref_id, $label[1], $feed_obj->owner_uid);
				}

				Debug::log("assigning labels [filters]...", Debug::LOG_VERBOSE);

				self::assign_article_to_label_filters($entry_ref_id, $article_filters,
					$feed_obj->owner_uid, $article_labels);

				if ($feed_obj->cache_images)
					self::cache_enclosures($enclosures, $site_url);

				if (Debug::get_loglevel() >= Debug::LOG_EXTENDED) {
					Debug::log("article enclosures:", Debug::LOG_VERBOSE);
					print_r($enclosures);
				}

				$esth = $pdo->prepare("SELECT id FROM ttrss_enclosures
						WHERE content_url = ? AND content_type = ? AND post_id = ?");

				$usth = $pdo->prepare("INSERT INTO ttrss_enclosures
							(content_url, content_type, title, duration, post_id, width, height) VALUES
							(?, ?, ?, ?, ?, ?, ?)");

				foreach ($enclosures as $enc) {
					$enc_url = $enc[0];
					$enc_type = $enc[1];
					$enc_dur = (int)$enc[2];
					$enc_title = $enc[3];
					$enc_width = intval($enc[4]);
					$enc_height = intval($enc[5]);

					$esth->execute([$enc_url, $enc_type, $entry_ref_id]);

					if (!$esth->fetch()) {
						$usth->execute([$enc_url, $enc_type, (string)$enc_title, $enc_dur, $entry_ref_id, $enc_width, $enc_height]);
					}
				}

				// check for manual tags (we have to do it here since they're loaded from filters)

				foreach ($article_filters as $f) {
					if ($f["type"] == "tag") {

						$manual_tags = array_map('trim', explode(",", mb_strtolower($f["param"])));

						foreach ($manual_tags as $tag) {
							array_push($entry_tags, $tag);
						}
					}
				}

				// Skip boring tags

				$boring_tags = array_map('trim',
						explode(",", mb_strtolower(
							get_pref(Prefs::BLACKLISTED_TAGS, $feed_obj->owner_uid))));

				$entry_tags = FeedItem_Common::normalize_categories(
					array_unique(
						array_diff($entry_tags, $boring_tags)));

				Debug::log("filtered tags: " . implode(", ", $entry_tags), Debug::LOG_VERBOSE);

				// Save article tags in the database

				if (count($entry_tags) > 0) {

					$tsth = $pdo->prepare("SELECT id FROM ttrss_tags
							WHERE tag_name = ? AND post_int_id = ? AND
							owner_uid = ? LIMIT 1");

					$usth = $pdo->prepare("INSERT INTO ttrss_tags
									(owner_uid,tag_name,post_int_id)
									VALUES (?, ?, ?)");

					foreach ($entry_tags as $tag) {
						$tsth->execute([$tag, $entry_int_id, $feed_obj->owner_uid]);

						if (!$tsth->fetch()) {
							$usth->execute([$feed_obj->owner_uid, $tag, $entry_int_id]);
						}
					}

					/* update the cache */

					$tsth = $pdo->prepare("UPDATE ttrss_user_entries
						SET tag_cache = ? WHERE ref_id = ?
						AND owner_uid = ?");

					$tsth->execute([
						join(",", $entry_tags),
						$entry_ref_id,
						$feed_obj->owner_uid
					]);
				}

				Debug::log("article processed.", Debug::LOG_VERBOSE);

				$pdo->commit();
			}

			Debug::log("=================================================================================================================================",
					Debug::LOG_VERBOSE);

			Debug::log("purging feed...", Debug::LOG_VERBOSE);

			Feeds::_purge($feed, 0);

			$feed_obj->set([
				'last_updated' => Db::NOW(),
				'last_unconditional' => Db::NOW(),
				'last_successful_update' => Db::NOW(),
				'last_error' => '',
			]);

			$feed_obj->save();

		} else {

			$error_msg = mb_substr($rss->error(), 0, 245);

			Debug::log("fetch error: $error_msg", Debug::LOG_VERBOSE);

			if (count($rss->errors()) > 1) {
				foreach ($rss->errors() as $error) {
					Debug::log("+ $error", Debug::LOG_VERBOSE);
				}
			}

			$feed_obj->set([
				'last_updated' => Db::NOW(),
				'last_unconditional' => Db::NOW(),
				'last_error' => $error_msg,
			]);

			$feed_obj->save();

			unset($rss);

			Debug::log("update failed.", Debug::LOG_VERBOSE);
			return false;
		}

		Debug::log("update done.", Debug::LOG_VERBOSE);
		return true;
	}

	/* TODO: move to DiskCache? */
	static function cache_enclosures($enclosures, $site_url) {
		$cache = new DiskCache("images");

		if ($cache->is_writable()) {
			foreach ($enclosures as $enc) {

				if (preg_match("/(image|audio|video)/", $enc[1])) {
					$src = rewrite_relative_url($site_url, $enc[0]);

					$local_filename = sha1($src);

					Debug::log("cache_enclosures: downloading: $src to $local_filename", Debug::LOG_VERBOSE);

					if (!$cache->exists($local_filename)) {
						$file_content = UrlHelper::fetch(array("url" => $src,
							"http_referrer" => $src,
							"max_size" => Config::get(Config::MAX_CACHE_FILE_SIZE)));

						if ($file_content) {
							$cache->put($local_filename, $file_content);
						} else {
							Debug::log("cache_enclosures: failed with ".UrlHelper::$fetch_last_error_code.": ".UrlHelper::$fetch_last_error);
						}
					} else if (is_writable($local_filename)) {
						$cache->touch($local_filename);
					}
				}
			}
		}
	}

	/* TODO: move to DiskCache? */
	static function cache_media_url($cache, $url, $site_url) {
		$url = rewrite_relative_url($site_url, $url);
		$local_filename = sha1($url);

		Debug::log("cache_media: checking $url", Debug::LOG_VERBOSE);

		if (!$cache->exists($local_filename)) {
			Debug::log("cache_media: downloading: $url to $local_filename", Debug::LOG_VERBOSE);

			$file_content = UrlHelper::fetch(array("url" => $url,
				"http_referrer" => $url,
				"max_size" => Config::get(Config::MAX_CACHE_FILE_SIZE)));

			if ($file_content) {
				$cache->put($local_filename, $file_content);
			} else {
				Debug::log("cache_media: failed with ".UrlHelper::$fetch_last_error_code.": ".UrlHelper::$fetch_last_error);
			}
		} else if ($cache->is_writable($local_filename)) {
			$cache->touch($local_filename);
		}
	}

	/* TODO: move to DiskCache? */
	static function cache_media($html, $site_url) {
		$cache = new DiskCache("images");

		if ($html && $cache->is_writable()) {
			$doc = new DOMDocument();
			if (@$doc->loadHTML($html)) {
				$xpath = new DOMXPath($doc);

				$entries = $xpath->query('(//img[@src]|//source[@src|@srcset]|//video[@poster|@src])');

				foreach ($entries as $entry) {
					foreach (array('src', 'poster') as $attr) {
						if ($entry->hasAttribute($attr) && strpos($entry->getAttribute($attr), "data:") !== 0) {
							self::cache_media_url($cache, $entry->getAttribute($attr), $site_url);
						}
					}

					if ($entry->hasAttribute("srcset")) {
						$matches = self::decode_srcset($entry->getAttribute('srcset'));

						for ($i = 0; $i < count($matches); $i++) {
							self::cache_media_url($cache, $matches[$i]["url"], $site_url);
						}
					}
				}
			}
		}
	}

	static function expire_error_log() {
		Debug::log("Removing old error log entries...");

		$pdo = Db::pdo();

		if (Config::get(Config::DB_TYPE) == "pgsql") {
			$pdo->query("DELETE FROM ttrss_error_log
				WHERE created_at < NOW() - INTERVAL '7 days'");
		} else {
			$pdo->query("DELETE FROM ttrss_error_log
				WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
		}
	}

	// deprecated; table not used
	static function expire_feed_archive() {
		$pdo = Db::pdo();

		$pdo->query("DELETE FROM ttrss_archived_feeds");
	}

	static function expire_lock_files() {
		Debug::log("Removing old lock files...", Debug::LOG_VERBOSE);

		$num_deleted = 0;

		if (is_writable(Config::get(Config::LOCK_DIRECTORY))) {
			$files = glob(Config::get(Config::LOCK_DIRECTORY) . "/*.lock");

			if ($files) {
				foreach ($files as $file) {
					if (!file_is_locked(basename($file)) && time() - filemtime($file) > 86400*2) {
						unlink($file);
						++$num_deleted;
					}
				}
			}
		}

		Debug::log("Removed $num_deleted old lock files.");
	}

	/**
	 * Source: http://www.php.net/manual/en/function.parse-url.php#104527
	 * Returns the url query as associative array
	 *
	 * @param    string    query
	 * @return    array    params
	 */
	/* static function convertUrlQuery($query) {
		$queryParts = explode('&', $query);

		$params = array();

		foreach ($queryParts as $param) {
			$item = explode('=', $param);
			$params[$item[0]] = $item[1];
		}

		return $params;
	} */

	static function get_article_filters($filters, $title, $content, $link, $author, $tags, &$matched_rules = false, &$matched_filters = false) {
		$matches = array();

		foreach ($filters as $filter) {
			$match_any_rule = $filter["match_any_rule"] ?? false;
			$inverse = $filter["inverse"] ?? false;
			$filter_match = false;
			$last_processed_rule = false;

			foreach ($filter["rules"] as $rule) {
				$match = false;
				$reg_exp = str_replace('/', '\/', (string)$rule["reg_exp"]);
				$reg_exp = str_replace("\n", "", $reg_exp); // reg_exp may be formatted with CRs now because of textarea, we need to strip those
				$rule_inverse = $rule["inverse"] ?? false;
				$last_processed_rule = $rule;

				if (empty($reg_exp))
					continue;

				switch ($rule["type"]) {
					case "title":
						$match = @preg_match("/$reg_exp/iu", $title);
						break;
					case "content":
						// we don't need to deal with multiline regexps
						$content = (string)preg_replace("/[\r\n\t]/", "", $content);

						$match = @preg_match("/$reg_exp/iu", $content);
						break;
					case "both":
						// we don't need to deal with multiline regexps
						$content = (string)preg_replace("/[\r\n\t]/", "", $content);

						$match = (@preg_match("/$reg_exp/iu", $title) || @preg_match("/$reg_exp/iu", $content));
						break;
					case "link":
						$match = @preg_match("/$reg_exp/iu", $link);
						break;
					case "author":
						$match = @preg_match("/$reg_exp/iu", $author);
						break;
					case "tag":
						foreach ($tags as $tag) {
							if (@preg_match("/$reg_exp/iu", $tag)) {
								$match = true;
								break;
							}
						}
						break;
				}

				if ($rule_inverse) $match = !$match;

				if ($match_any_rule) {
					if ($match) {
						$filter_match = true;
						break;
					}
				} else {
					$filter_match = $match;
					if (!$match) {
						break;
					}
				}
			}

			if ($inverse) $filter_match = !$filter_match;

			if ($filter_match) {
				if (is_array($matched_rules)) array_push($matched_rules, $last_processed_rule);
				if (is_array($matched_filters)) array_push($matched_filters, $filter);

				foreach ($filter["actions"] AS $action) {
					array_push($matches, $action);

					// if Stop action encountered, perform no further processing
					if (isset($action["type"]) && $action["type"] == "stop") return $matches;
				}
			}
		}

		return $matches;
	}

	static function find_article_filter($filters, $filter_name) {
		foreach ($filters as $f) {
			if ($f["type"] == $filter_name) {
				return $f;
			};
		}
		return false;
	}

	static function find_article_filters($filters, $filter_name) {
		$results = array();

		foreach ($filters as $f) {
			if ($f["type"] == $filter_name) {
				array_push($results, $f);
			};
		}
		return $results;
	}

	static function calculate_article_score($filters) {
		$score = 0;

		foreach ($filters as $f) {
			if ($f["type"] == "score") {
				$score += $f["param"];
			};
		}
		return $score;
	}

	static function labels_contains_caption($labels, $caption) {
		foreach ($labels as $label) {
			if ($label[1] == $caption) {
				return true;
			}
		}

		return false;
	}

	static function assign_article_to_label_filters($id, $filters, $owner_uid, $article_labels) {
		foreach ($filters as $f) {
			if ($f["type"] == "label") {
				if (!self::labels_contains_caption($article_labels, $f["param"])) {
					Labels::add_article($id, $f["param"], $owner_uid);
				}
			}
		}
	}

	static function make_guid_from_title($title) {
		return preg_replace("/[ \"\',.:;]/", "-",
			mb_strtolower(strip_tags($title), 'utf-8'));
	}

	/* counter cache is no longer used, if called truncate leftover data */
	static function cleanup_counters_cache() {
		$pdo = Db::pdo();

		$pdo->query("DELETE FROM ttrss_counters_cache");
		$pdo->query("DELETE FROM ttrss_cat_counters_cache");
	}

	static function disable_failed_feeds() {
		if (Config::get(Config::DAEMON_UNSUCCESSFUL_DAYS_LIMIT) > 0) {

			$pdo = Db::pdo();

			$pdo->beginTransaction();

			$days = Config::get(Config::DAEMON_UNSUCCESSFUL_DAYS_LIMIT);

			if (Config::get(Config::DB_TYPE) == "pgsql") {
				$interval_query = "last_successful_update < NOW() - INTERVAL '$days days' AND last_updated > NOW() - INTERVAL '1 days'";
			} else /* if (Config::get(Config::DB_TYPE) == "mysql") */ {
				$interval_query = "last_successful_update < DATE_SUB(NOW(), INTERVAL $days DAY) AND last_updated > DATE_SUB(NOW(), INTERVAL 1 DAY)";
			}

			$sth = $pdo->prepare("SELECT id, title, owner_uid
				FROM ttrss_feeds
				WHERE update_interval != -1 AND last_successful_update IS NOT NULL AND $interval_query");

			$sth->execute();

			while ($row = $sth->fetch()) {
				Logger::log(E_USER_NOTICE,
					sprintf("Auto disabling feed %d (%s, UID: %d) because it failed to update for %d days.",
						$row["id"], clean($row["title"]), $row["owner_uid"], Config::get(Config::DAEMON_UNSUCCESSFUL_DAYS_LIMIT)));

				Debug::log(sprintf("Auto-disabling feed %d (%s) (failed to update for %d days).", $row["id"],
					clean($row["title"]), Config::get(Config::DAEMON_UNSUCCESSFUL_DAYS_LIMIT)));
			}

			$sth = $pdo->prepare("UPDATE ttrss_feeds SET update_interval = -1 WHERE
				update_interval != -1 AND last_successful_update IS NOT NULL AND $interval_query");
			$sth->execute();

			$pdo->commit();
		}
	}

	static function housekeeping_user($owner_uid) {
		$tmph = new PluginHost();

		UserHelper::load_user_plugins($owner_uid, $tmph);

		$tmph->run_hooks(PluginHost::HOOK_HOUSE_KEEPING);
	}

	static function housekeeping_common() {
		DiskCache::expire();

		self::expire_lock_files();
		self::expire_error_log();
		self::expire_feed_archive();
		self::cleanup_feed_browser();
		self::cleanup_feed_icons();
		self::disable_failed_feeds();

		Article::_purge_orphans();
		self::cleanup_counters_cache();

		PluginHost::getInstance()->run_hooks(PluginHost::HOOK_HOUSE_KEEPING);
	}

	static function update_favicon(string $site_url, int $feed) {
		$icon_file = Config::get(Config::ICONS_DIR) . "/$feed.ico";

		$favicon_url = self::get_favicon_url($site_url);
		if (!$favicon_url) {
			Debug::log("favicon: couldn't find favicon URL in $site_url", Debug::LOG_VERBOSE);
			return false;
		}

		// Limiting to "image" type misses those served with text/plain
		$contents = UrlHelper::fetch([
			'url' => $favicon_url,
			'max_size' => Config::get(Config::MAX_FAVICON_FILE_SIZE),
			//'type' => 'image',
		]);
		if (!$contents) {
			Debug::log("favicon: fetching $favicon_url failed", Debug::LOG_VERBOSE);
			return false;
		}

		// Crude image type matching.
		// Patterns gleaned from the file(1) source code.
		if (preg_match('/^\x00\x00\x01\x00/', $contents)) {
			// 0       string  \000\000\001\000        MS Windows icon resource
			//error_log("update_favicon: favicon_url=$favicon_url isa MS Windows icon resource");
		}
		elseif (preg_match('/^GIF8/', $contents)) {
			// 0       string          GIF8            GIF image data
			//error_log("update_favicon: favicon_url=$favicon_url isa GIF image");
		}
		elseif (preg_match('/^\x89PNG\x0d\x0a\x1a\x0a/', $contents)) {
			// 0       string          \x89PNG\x0d\x0a\x1a\x0a         PNG image data
			//error_log("update_favicon: favicon_url=$favicon_url isa PNG image");
		}
		elseif (preg_match('/^\xff\xd8/', $contents)) {
			// 0       beshort         0xffd8          JPEG image data
			//error_log("update_favicon: favicon_url=$favicon_url isa JPG image");
		}
		elseif (preg_match('/^BM/', $contents)) {
			// 0	string		BM	PC bitmap (OS2, Windows BMP files)
			//error_log("update_favicon, favicon_url=$favicon_url isa BMP image");
		}
		else {
			//error_log("update_favicon: favicon_url=$favicon_url isa UNKNOWN type");
			Debug::log("favicon $favicon_url type is unknown (not updating)", Debug::LOG_VERBOSE);
			return false;
		}

		Debug::log("favicon: saving to $icon_file", Debug::LOG_VERBOSE);

		$fp = @fopen($icon_file, "w");
		if (!$fp) {
			Debug::log("favicon: failed to open $icon_file for writing", Debug::LOG_VERBOSE);
			return false;
		}

		fwrite($fp, $contents);
		fclose($fp);
		chmod($icon_file, 0644);
		clearstatcache();

		return $icon_file;
	}

	static function is_gzipped($feed_data) {
		return strpos(substr($feed_data, 0, 3),
				"\x1f" . "\x8b" . "\x08", 0) === 0;
	}

	static function load_filters(int $feed_id, int $owner_uid) {
		$filters = array();

		$feed_id = (int) $feed_id;
		$cat_id = Feeds::_cat_of($feed_id);

		if (!$cat_id)
			$null_cat_qpart = "cat_id IS NULL OR";
		else
			$null_cat_qpart = "";

		$pdo = Db::pdo();

		$sth = $pdo->prepare("SELECT * FROM ttrss_filters2 WHERE
				owner_uid = ? AND enabled = true ORDER BY order_id, title");
		$sth->execute([$owner_uid]);

		$check_cats = array_merge(
			Feeds::_get_parent_cats($cat_id, $owner_uid),
			[$cat_id]);

		$check_cats_str = join(",", $check_cats);
		$check_cats_fullids = array_map(function($a) { return "CAT:$a"; }, $check_cats);

		while ($line = $sth->fetch()) {
			$filter_id = $line["id"];

			$match_any_rule = sql_bool_to_bool($line["match_any_rule"]);

			$sth2 = $pdo->prepare("SELECT
					r.reg_exp, r.inverse, r.feed_id, r.cat_id, r.cat_filter, r.match_on, t.name AS type_name
					FROM ttrss_filters2_rules AS r,
					ttrss_filter_types AS t
					WHERE
						(match_on IS NOT NULL OR
						  (($null_cat_qpart (cat_id IS NULL AND cat_filter = false) OR cat_id IN ($check_cats_str)) AND
						  (feed_id IS NULL OR feed_id = ?))) AND
						filter_type = t.id AND filter_id = ?");
			$sth2->execute([$feed_id, $filter_id]);

			$rules = array();
			$actions = array();

			while ($rule_line = $sth2->fetch()) {
				#				print_r($rule_line);

				if ($rule_line["match_on"]) {
					$match_on = json_decode($rule_line["match_on"], true);

					if (in_array("0", $match_on) || in_array($feed_id, $match_on) || count(array_intersect($check_cats_fullids, $match_on)) > 0) {

						$rule = array();
						$rule["reg_exp"] = $rule_line["reg_exp"];
						$rule["type"] = $rule_line["type_name"];
						$rule["inverse"] = sql_bool_to_bool($rule_line["inverse"]);

						array_push($rules, $rule);
					} else if (!$match_any_rule) {
						// this filter contains a rule that doesn't match to this feed/category combination
						// thus filter has to be rejected

						$rules = [];
						break;
					}

				} else {

					$rule = array();
					$rule["reg_exp"] = $rule_line["reg_exp"];
					$rule["type"] = $rule_line["type_name"];
					$rule["inverse"] = sql_bool_to_bool($rule_line["inverse"]);

					array_push($rules, $rule);
				}
			}

			if (count($rules) > 0) {
				$sth2 = $pdo->prepare("SELECT a.action_param,t.name AS type_name
						FROM ttrss_filters2_actions AS a,
						ttrss_filter_actions AS t
						WHERE
							action_id = t.id AND filter_id = ?");
				$sth2->execute([$filter_id]);

				while ($action_line = $sth2->fetch()) {
					#				print_r($action_line);

					$action = array();
					$action["type"] = $action_line["type_name"];
					$action["param"] = $action_line["action_param"];

					array_push($actions, $action);
				}
			}

			$filter = [];
			$filter["id"] = $filter_id;
			$filter["match_any_rule"] = sql_bool_to_bool($line["match_any_rule"]);
			$filter["inverse"] = sql_bool_to_bool($line["inverse"]);
			$filter["rules"] = $rules;
			$filter["actions"] = $actions;

			if (count($rules) > 0 && count($actions) > 0) {
				array_push($filters, $filter);
			}
		}

		return $filters;
	}

	/**
	 * Try to determine the favicon URL for a feed.
	 * adapted from wordpress favicon plugin by Jeff Minard (http://thecodepro.com/)
	 * http://dev.wp-plugins.org/file/favatars/trunk/favatars.php
	 *
	 * @param string $url A feed or page URL
	 * @access public
	 * @return mixed The favicon URL, or false if none was found.
	 */
	static function get_favicon_url(string $url) {

		$favicon_url = false;

		if ($html = @UrlHelper::fetch($url)) {

			$doc = new DOMDocument();
			if (@$doc->loadHTML($html)) {
				$xpath = new DOMXPath($doc);

				$base = $xpath->query('/html/head/base[@href]');
				foreach ($base as $b) {
					$url = rewrite_relative_url($url, $b->getAttribute("href"));
					break;
				}

				$entries = $xpath->query('/html/head/link[@rel="shortcut icon" or @rel="icon"]');
				if (count($entries) > 0) {
					foreach ($entries as $entry) {
						$favicon_url = rewrite_relative_url($url, $entry->getAttribute("href"));
						break;
					}
				}
			}
		}

		if (!$favicon_url)
			$favicon_url = rewrite_relative_url($url, "/favicon.ico");

		return $favicon_url;
	}

	// https://community.tt-rss.org/t/problem-with-img-srcset/3519
	static function decode_srcset($srcset) {
		$matches = [];

		preg_match_all(
			'/(?:\A|,)\s*(?P<url>(?!,)\S+(?<!,))\s*(?P<size>\s\d+w|\s\d+(?:\.\d+)?(?:[eE][+-]?\d+)?x|)\s*(?=,|\Z)/',
			$srcset, $matches, PREG_SET_ORDER
		);

		foreach ($matches as $m) {
			array_push($matches, [
				"url" => trim($m["url"]),
				"size" => trim($m["size"])
			]);
		}

		return $matches;
	}

	static function encode_srcset($matches) {
		$tokens = [];

		foreach ($matches as $m) {
			array_push($tokens, trim($m["url"]) . " " . trim($m["size"]));
		}

		return implode(",", $tokens);
	}

	static function function_enabled($func) {
		return !in_array($func,
						explode(',', (string)ini_get('disable_functions')));
	}
}
