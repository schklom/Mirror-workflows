#!/usr/bin/env php
<?php
	set_include_path(__DIR__ ."/include" . PATH_SEPARATOR .
		get_include_path());

	define('DISABLE_SESSIONS', true);

	chdir(__DIR__);

	require_once "autoload.php";
	require_once "functions.php";

	Config::sanity_check();

	function make_stampfile($filename) {
		$fp = fopen(Config::get(Config::LOCK_DIRECTORY) . "/$filename", "w");

		if (flock($fp, LOCK_EX | LOCK_NB)) {
			fwrite($fp, time() . "\n");
			flock($fp, LOCK_UN);
			fclose($fp);
			return true;
		} else {
			return false;
		}
	}

	function cleanup_tags($days = 14, $limit = 1000) {

		$days = (int) $days;

		if (Config::get(Config::DB_TYPE) == "pgsql") {
			$interval_query = "date_updated < NOW() - INTERVAL '$days days'";
		} else /*if (Config::get(Config::DB_TYPE) == "mysql") */ {
			$interval_query = "date_updated < DATE_SUB(NOW(), INTERVAL $days DAY)";
		}

		$tags_deleted = 0;

		$pdo = Db::pdo();

		while ($limit > 0) {
			$limit_part = 500;

			$sth = $pdo->prepare("SELECT ttrss_tags.id AS id
						FROM ttrss_tags, ttrss_user_entries, ttrss_entries
						WHERE post_int_id = int_id AND $interval_query AND
						ref_id = ttrss_entries.id AND tag_cache != '' LIMIT ?");
			$sth->bindValue(1, $limit_part, PDO::PARAM_INT);
			$sth->execute();

			$ids = array();

			while ($line = $sth->fetch()) {
				array_push($ids, $line['id']);
			}

			if (count($ids) > 0) {
				$ids = join(",", $ids);

				$usth = $pdo->query("DELETE FROM ttrss_tags WHERE id IN ($ids)");
				$tags_deleted = $usth->rowCount();
			} else {
				break;
			}

			$limit -= $limit_part;
		}

		return $tags_deleted;
	}

	$pdo = Db::pdo();

	init_plugins();

	$options_map = [
		"feeds" => "update all pending feeds",
		"daemon" => "start single-process update daemon",
		"daemon-loop" => "",
		"update-feed:" => "",
		"send-digests" =>  "send pending email digests",
		"task:" => "",
		"cleanup-tags" => "perform maintenance on tags table",
		"quiet" => "don't output messages to stdout",
		"log:" => ["FILE", "log messages to FILE"],
		"log-level:" => ["N", "set log verbosity level (0-2)"],
		"pidlock:" => "",
		"update-schema::" => ["[force-yes]", "update database schema, optionally without prompting"],
		"force-update" => "mark all feeds as pending update",
		"gen-search-idx" => "generate basic PostgreSQL fulltext search index",
		"plugins-list" => "list installed plugins",
		"debug-feed:" => ["N", "update specified feed with debug output enabled"],
		"debug-force-refetch" => "debug update: force refetch feed data",
		"debug-force-rehash" => "debug update: force rehash articles",
		"opml-export:" => ["USER:FILE", "export OPML of USER to FILE"],
		"user-list" => "list all users",
#		"user-add:" => ["USER[:PASSWORD]", "add USER, optionally without prompting for PASSWORD"],
#		"user-remove:" => ["USERNAME", "remove specified user"],
		"help" => "",
	];

	foreach (PluginHost::getInstance()->get_commands() as $command => $data) {
		$options_map[$command . $data["suffix"]] = [ $data["arghelp"] ?? "", $data["description"] ];
	}

	if (php_sapi_name() != "cli") {
		header("Content-type: text/plain");
		print "Please run this script from the command line.\n";
		exit;
	}

	$options = getopt("", array_keys($options_map));

	if (count($options) == 0 || isset($options["help"]) ) {
		print "Tiny Tiny RSS CLI management tool\n";
		print "=================================\n";
		print "Options:\n\n";

		$options_help = [];

		foreach ($options_map as $option => $descr) {
			if (substr($option, -1) === ":")
				$option = substr($option, 0, -1);

			$help_key = trim(sprintf("--%s %s",
								$option, is_array($descr) ? $descr[0] : ""));
			$help_value = is_array($descr) ? $descr[1] : $descr;

			if ($help_value)
				$options_help[$help_key] = $help_value;
		}

		$max_key_len = array_reduce(array_keys($options_help),
			function ($carry, $item) { $len = strlen($item); return $len > $carry ? strlen($item) : $carry; });

		foreach ($options_help as $option => $help_text) {
			printf("  %s %s\n", str_pad($option, $max_key_len + 5), $help_text);
		}

		return;
	}

	if (!isset($options['daemon'])) {
		require_once "errorhandler.php";
	}

	if (!isset($options['update-schema']) && Config::is_migration_needed()) {
		die("Schema version is wrong, please upgrade the database (--update-schema).\n");
	}

	Debug::set_enabled(true);

	if (isset($options["log-level"])) {
	    Debug::set_loglevel((int)$options["log-level"]);
    }

	if (isset($options["log"])) {
		Debug::set_quiet(isset($options['quiet']));
		Debug::set_logfile($options["log"]);
        Debug::log("Logging to " . $options["log"]);
    } else {
	    if (isset($options['quiet'])) {
			Debug::set_loglevel(Debug::$LOG_DISABLED);
        }
    }

	if (!isset($options["daemon"])) {
		$lock_filename = "update.lock";
	} else {
		$lock_filename = "update_daemon.lock";
	}

	if (isset($options["task"])) {
		Debug::log("Using task id " . $options["task"]);
		$lock_filename = $lock_filename . "-task_" . $options["task"];
	}

	if (isset($options["pidlock"])) {
		$my_pid = $options["pidlock"];
		$lock_filename = "update_daemon-$my_pid.lock";

	}

	Debug::log("Lock: $lock_filename");

	$lock_handle = make_lockfile($lock_filename);
	$must_exit = false;

	if (isset($options["task"]) && isset($options["pidlock"])) {
		$waits = $options["task"] * 5;
		Debug::log("Waiting before update ($waits)...");
		sleep($waits);
	}

	// Try to lock a file in order to avoid concurrent update.
	if (!$lock_handle) {
		die("error: Can't create lockfile ($lock_filename). ".
			"Maybe another update process is already running.\n");
	}

	if (isset($options["force-update"])) {
		Debug::log("marking all feeds as needing update...");

		$pdo->query( "UPDATE ttrss_feeds SET
          last_update_started = '1970-01-01', last_updated = '1970-01-01'");
	}

	if (isset($options["feeds"])) {
		RSSUtils::update_daemon_common(Config::get(Config::DAEMON_FEED_LIMIT), $options);
		RSSUtils::housekeeping_common();

		PluginHost::getInstance()->run_hooks(PluginHost::HOOK_UPDATE_TASK, $options);
	}

	if (isset($options["daemon"])) {
		while (true) {
			$quiet = (isset($options["quiet"])) ? "--quiet" : "";
			$log = isset($options['log']) ? '--log '.$options['log'] : '';
			$log_level = isset($options['log-level']) ? '--log-level '.$options['log-level'] : '';

			passthru(Config::get(Config::PHP_EXECUTABLE) . " " . $argv[0] ." --daemon-loop $quiet $log $log_level");

			// let's enforce a minimum spawn interval as to not forkbomb the host
			$spawn_interval = max(60, Config::get(Config::DAEMON_SLEEP_INTERVAL));

			Debug::log("Sleeping for $spawn_interval seconds...");
			sleep($spawn_interval);
		}
	}

	if (isset($options["update-feed"])) {
		try {

			if (!RSSUtils::update_rss_feed((int)$options["update-feed"], true))
				exit(100);

		} catch (PDOException $e) {
			Debug::log(sprintf("Exception while updating feed %d: %s (%s:%d)",
				$options["update-feed"], $e->getMessage(), $e->getFile(), $e->getLine()));

			Logger::log_error(E_USER_WARNING, $e->getMessage(), $e->getFile(), $e->getLine(), $e->getTraceAsString());

			exit(110);
		}
	}

	if (isset($options["daemon-loop"])) {
		if (!make_stampfile('update_daemon.stamp')) {
			Debug::log("warning: unable to create stampfile\n");
		}

		RSSUtils::update_daemon_common(isset($options["pidlock"]) ? 50 : Config::get(Config::DAEMON_FEED_LIMIT), $options);

		if (!isset($options["pidlock"]) || $options["task"] == "0")
			RSSUtils::housekeeping_common();

		PluginHost::getInstance()->run_hooks(PluginHost::HOOK_UPDATE_TASK, $options);
	}

	if (isset($options["cleanup-tags"])) {
		$rc = cleanup_tags( 14, 50000);
		Debug::log("$rc tags deleted.\n");
	}

	if (isset($options["update-schema"])) {
		if (Config::is_migration_needed()) {

			if ($options["update-schema"] != "force-yes") {
				Debug::log("Type 'yes' to continue.");

				if (read_stdin() != 'yes')
					exit;
			} else {
				Debug::log("Proceeding to update without confirmation.");
			}

			if (!isset($options["log-level"])) {
				Debug::set_loglevel(Debug::$LOG_VERBOSE);
			}

			$migrations = Config::get_migrations();
			$migrations->migrate();

		} else {
			Debug::log("Database schema is already at latest version.");
		}
	}

	if (isset($options["gen-search-idx"])) {
		echo "Generating search index (stemming set to English)...\n";

		$res = $pdo->query("SELECT COUNT(id) AS count FROM ttrss_entries WHERE tsvector_combined IS NULL");
		$row = $res->fetch();
		$count = $row['count'];

		print "Articles to process: $count.\n";

		$limit = 500;
		$processed = 0;

		$sth = $pdo->prepare("SELECT id, title, content FROM ttrss_entries WHERE
          tsvector_combined IS NULL ORDER BY id LIMIT ?");
		$sth->execute([$limit]);

		$usth = $pdo->prepare("UPDATE ttrss_entries
          SET tsvector_combined = to_tsvector('english', ?) WHERE id = ?");

		while (true) {

			while ($line = $sth->fetch()) {
				$tsvector_combined = mb_substr(strip_tags($line["title"] . " " . $line["content"]), 0, 1000000);

				$usth->execute([$tsvector_combined, $line['id']]);

				$processed++;
			}

			print "Processed $processed articles...\n";

			if ($processed < $limit) {
				echo "All done.\n";
				break;
			}
		}
	}

	if (isset($options["plugins-list"])) {
		$tmppluginhost = new PluginHost();
		$tmppluginhost->load_all($tmppluginhost::KIND_ALL);
		$enabled = array_map("trim", explode(",", Config::get(Config::PLUGINS)));

		echo "List of all available plugins:\n";

		foreach ($tmppluginhost->get_plugins() as $name => $plugin) {
			$about = $plugin->about();

			$status = $about[3] ? "system" : "user";

			if (in_array($name, $enabled)) $name .= "*";

			printf("%-50s %-10s v%.2f (by %s)\n%s\n\n",
				$name, $status, $about[0], $about[2], $about[1]);
		}

		echo "Plugins marked by * are currently enabled for all users.\n";

	}

	if (isset($options["debug-feed"])) {
		$feed = (int) $options["debug-feed"];

		if (isset($options["force-refetch"])) $_REQUEST["force_refetch"] = true;
		if (isset($options["force-rehash"])) $_REQUEST["force_rehash"] = true;

		Debug::set_loglevel(Debug::$LOG_EXTENDED);

		$rc = RSSUtils::update_rss_feed($feed) != false ? 0 : 1;

		exit($rc);
	}

	if (isset($options["send-digests"])) {
		Digest::send_headlines_digests();
	}

	if (isset($options["user-list"])) {
		$users = ORM::for_table('ttrss_users')
			->order_by_expr('id')
			->find_many();

		foreach ($users as $user) {
			printf ("%-4d\t%-15s\t%-20s\t%-20s\n",
				$user->id, $user->login, $user->full_name, $user->email);
		}
	}

	if (isset($options["opml-export"])) {
		list ($user, $filename) = explode(":", $options["opml-export"], 2);

		Debug::log("Exporting feeds of user $user to $filename as OPML...");

		if ($owner_uid = UserHelper::find_user_by_login($user)) {
			$opml = new OPML("");

			$rc = $opml->opml_export($filename, $owner_uid, false, true, true);

			Debug::log($rc ? "Success." : "Failed.");
		} else {
			Debug::log("User not found: $user");
		}

	}

	PluginHost::getInstance()->run_commands($options);

	if (file_exists(Config::get(Config::LOCK_DIRECTORY) . "/$lock_filename"))
		if (strtoupper(substr(PHP_OS, 0, 3)) == 'WIN')
			fclose($lock_handle);
		unlink(Config::get(Config::LOCK_DIRECTORY) . "/$lock_filename");
?>
