#!/usr/bin/env php
<?php
	set_include_path(__DIR__ ."/include" . PATH_SEPARATOR .
		get_include_path());

	declare(ticks = 1);
	chdir(__DIR__);

	define('DISABLE_SESSIONS', true);

	require_once "autoload.php";
	require_once "functions.php";

	Config::sanity_check();

	if (!function_exists('pcntl_fork')) {
		die("error: This script requires PHP compiled with PCNTL module.\n");
	}

	$options = getopt("");

	if (!is_array($options)) {
		die("error: getopt() failed. ".
			"Most probably you are using PHP CGI to run this script ".
			"instead of required PHP CLI. Check tt-rss wiki page on updating feeds for ".
			"additional information.\n");
	}


	$master_handlers_installed = false;

	$children = array();
	$ctimes = array();

	$last_checkpoint = -1;

	/**
	 * @SuppressWarnings(unused)
	 */
	function reap_children() {
		global $children;
		global $ctimes;

		$tmp = array();

		foreach ($children as $pid) {
			if (pcntl_waitpid($pid, $status, WNOHANG) != $pid) {

				if (file_is_locked("update_daemon-$pid.lock")) {
					array_push($tmp, $pid);
				} else {
					Debug::log("Child process with PID $pid seems active but lockfile is unlocked.");
					unset($ctimes[$pid]);

				}
			} else {
				Debug::log("Child process with PID $pid reaped.");
				unset($ctimes[$pid]);
			}
		}

		$children = $tmp;

		return count($tmp);
	}

	function check_ctimes() {
		global $ctimes;

		foreach (array_keys($ctimes) as $pid) {
			$started = $ctimes[$pid];

			if (time() - $started > Config::get(Config::DAEMON_MAX_CHILD_RUNTIME)) {
				Debug::log("Child process with PID $pid seems to be stuck, aborting...");
				posix_kill($pid, SIGKILL);
			}
		}
	}

	/**
	* @SuppressWarnings(unused)
 	*/
	function sigchld_handler($signal) {
		$running_jobs = reap_children();

		Debug::log("Received SIGCHLD, $running_jobs active tasks left.");

		pcntl_waitpid(-1, $status, WNOHANG);
	}

	function shutdown($caller_pid) {
		if ($caller_pid == posix_getpid()) {
			if (file_exists(Config::get(Config::LOCK_DIRECTORY) . "/update_daemon.lock")) {
				Debug::log("Removing lockfile (master)...");
				unlink(Config::get(Config::LOCK_DIRECTORY) . "/update_daemon.lock");
			}
		}
	}

	function task_shutdown() {
		$pid = posix_getpid();

		if (file_exists(Config::get(Config::LOCK_DIRECTORY) . "/update_daemon-$pid.lock")) {
			Debug::log("Removing task lockfile for PID $pid...");
			unlink(Config::get(Config::LOCK_DIRECTORY) . "/update_daemon-$pid.lock");
		}
	}

	function sigint_handler() {
		Debug::log("[MASTER] SIG_INT received, shutting down master process.");
		shutdown(posix_getpid());
		die;
	}

	function task_sigint_handler() {
		Debug::log("[TASK] SIG_INT received, shutting down task.");
		task_shutdown();
		die;
	}

	pcntl_signal(SIGCHLD, 'sigchld_handler');

	$longopts = array("log:",
			"log-level:",
			"tasks:",
			"interval:",
			"quiet",
			"help");

	$options = getopt("", $longopts);

	if (isset($options["help"]) ) {
		print "Tiny Tiny RSS update daemon.\n\n";
		print "Options:\n";
		print "  --log FILE           - log messages to FILE\n";
        print "  --log-level N        - log verbosity level\n";
		print "  --tasks N            - amount of update tasks to spawn\n";
		print "                         default: " . Config::get(Config::DAEMON_MAX_JOBS) . "\n";
		print "  --interval N         - task spawn interval\n";
		print "                         default: " . Config::get(Config::DAEMON_SLEEP_INTERVAL) . " seconds.\n";
		print "  --quiet              - don't output messages to stdout\n";
		return;
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

	if (isset($options["tasks"])) {
		Debug::log("Set to spawn " . $options["tasks"] . " children.");
		$max_jobs = $options["tasks"];
	} else {
		$max_jobs = Config::get(Config::DAEMON_MAX_JOBS);
	}

	if (isset($options["interval"])) {
		Debug::log("Spawn interval: " . $options["interval"] . " seconds.");
		$spawn_interval = $options["interval"];
	} else {
		$spawn_interval = Config::get(Config::DAEMON_SLEEP_INTERVAL);
	}

	// let's enforce a minimum spawn interval as to not forkbomb the host
	$spawn_interval = max(60, $spawn_interval);
	Debug::log("Spawn interval: $spawn_interval sec");

	if (file_is_locked("update_daemon.lock")) {
		die("error: Can't create lockfile. ".
			"Maybe another daemon is already running.\n");
	}

	// Try to lock a file in order to avoid concurrent update.
	$lock_handle = make_lockfile("update_daemon.lock");

	if (!$lock_handle) {
		die("error: Can't create lockfile. ".
			"Maybe another daemon is already running.\n");
	}

	if (Config::is_migration_needed()) {
		die("Schema version is wrong, please upgrade the database.\n");
	}

	// Protip: children close shared database handle when terminating, it's a bad idea to
	// do database stuff on main process from now on.

	while (true) {

		// Since sleep is interupted by SIGCHLD, we need another way to
		// respect the spawn interval
		$next_spawn = $last_checkpoint + $spawn_interval - time();

		if ($next_spawn % 60 == 0) {
			$running_jobs = count($children);
			Debug::log("$running_jobs active tasks, next spawn at $next_spawn sec.");
		}

		if ($last_checkpoint + $spawn_interval < time()) {
			check_ctimes();
			reap_children();

			for ($j = count($children); $j < $max_jobs; $j++) {
				$pid = pcntl_fork();
				if ($pid == -1) {
					die("fork failed!\n");
				} else if ($pid) {

					if (!$master_handlers_installed) {
						Debug::log("Installing shutdown handlers");
						pcntl_signal(SIGINT, 'sigint_handler');
						pcntl_signal(SIGTERM, 'sigint_handler');
						register_shutdown_function('shutdown', posix_getpid());
						$master_handlers_installed = true;
					}

					Debug::log("Spawned child process with PID $pid for task $j.");
					array_push($children, $pid);
					$ctimes[$pid] = time();
				} else {
					pcntl_signal(SIGCHLD, SIG_IGN);
					pcntl_signal(SIGINT, 'task_sigint_handler');

					register_shutdown_function('task_shutdown');

					$quiet = (isset($options["quiet"])) ? "--quiet" : "";
					$log = function_exists("flock") && isset($options['log']) ? '--log '.$options['log'] : '';

					$my_pid = posix_getpid();

					passthru(Config::get(Config::PHP_EXECUTABLE) . " update.php --daemon-loop $quiet $log --task $j --pidlock $my_pid");

					sleep(1);

					// We exit in order to avoid fork bombing.
					exit(0);
				}
			}
			$last_checkpoint = time();
		}
		sleep(1);
	}

?>
