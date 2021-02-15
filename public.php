<?php
	set_include_path(dirname(__FILE__) ."/include" . PATH_SEPARATOR .
		get_include_path());

	require_once "autoload.php";
	require_once "sessions.php";
	require_once "functions.php";
	require_once "sanity_check.php";
	require_once "config.php";
	require_once "db.php";
	require_once "db-prefs.php";

	startup_gettext();

	$script_started = microtime(true);

	if (!init_plugins()) return;

	$method = (string)clean($_REQUEST["op"]);

	$override = PluginHost::getInstance()->lookup_handler("public", $method);

	if ($override) {
		$handler = $override;
	} else {
		$handler = new Handler_Public($_REQUEST);
	}

	if (strpos($method, "_") === 0) {
		user_error("Refusing to invoke method $method which starts with underscore.", E_USER_WARNING);
		header("Content-Type: text/json");
		print error_json(6);
		return;
	}

	if (implements_interface($handler, "IHandler") && $handler->before($method)) {
		if ($method && method_exists($handler, $method)) {
			$reflection = new ReflectionMethod($handler, $method);

			if ($reflection->getNumberOfRequiredParameters() == 0) {
				$handler->$method();
			} else {
				user_error("Refusing to invoke method $method which has required parameters.", E_USER_WARNING);
				header("Content-Type: text/json");
				print error_json(6);
			}
		} else if (method_exists($handler, 'index')) {
			$handler->index();
		}
		$handler->after();
		return;
	}

	header("Content-Type: text/plain");
	print error_json(13);
?>
