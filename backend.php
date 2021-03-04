<?php
	set_include_path(__DIR__ ."/include" . PATH_SEPARATOR .
		get_include_path());

	$op = $_REQUEST["op"];
	$method = !empty($_REQUEST['subop']) ?
		$_REQUEST['subop'] :
		$_REQUEST["method"] ?? false;

	if (!$method)
		$method = 'index';
	else
		$method = strtolower($method);

	/* Public calls compatibility shim */

	$public_calls = array("globalUpdateFeeds", "rss", "getUnread", "getProfiles", "share");

	if (array_search($op, $public_calls) !== false) {
		header("Location: public.php?" . $_SERVER['QUERY_STRING']);
		return;
	}

	$csrf_token = $_POST['csrf_token'] ?? "";

	require_once "autoload.php";
	require_once "sessions.php";
	require_once "functions.php";

	$op = (string)clean($op);
	$method = (string)clean($method);

	startup_gettext();

	$script_started = microtime(true);

	if (!init_plugins()) return;

	header("Content-Type: text/json; charset=utf-8");

	if (Config::get(Config::SINGLE_USER_MODE)) {
		UserHelper::authenticate( "admin", null);
	}

	if (!empty($_SESSION["uid"])) {
		if (!\Sessions\validate_session()) {
			header("Content-Type: text/json");
			print Errors::to_json(Errors::E_UNAUTHORIZED);
			return;
		}
		UserHelper::load_user_plugins($_SESSION["uid"]);
	}

	if (Config::is_migration_needed()) {
		print Errors::to_json(Errors::E_SCHEMA_MISMATCH);
		return;
	}

	$purge_intervals = array(
		0  => __("Use default"),
		-1 => __("Never purge"),
		7  => __("1 week old"),
		14 => __("2 weeks old"),
		31 => __("1 month old"),
		60 => __("2 months old"),
		90 => __("3 months old"));

	$update_intervals = array(
		0   => __("Default interval"),
		-1  => __("Disable updates"),
		15  => __("15 minutes"),
		30  => __("30 minutes"),
		60  => __("Hourly"),
		240 => __("4 hours"),
		720 => __("12 hours"),
		1440 => __("Daily"),
		10080 => __("Weekly"));

	$update_intervals_nodefault = array(
		-1  => __("Disable updates"),
		15  => __("15 minutes"),
		30  => __("30 minutes"),
		60  => __("Hourly"),
		240 => __("4 hours"),
		720 => __("12 hours"),
		1440 => __("Daily"),
		10080 => __("Weekly"));

	$access_level_names = array(
		0 => __("User"),
		5 => __("Power User"),
		10 => __("Administrator"));

	// shortcut syntax for plugin methods (?op=plugin--pmethod&...params)
	/* if (strpos($op, PluginHost::PUBLIC_METHOD_DELIMITER) !== false) {
		list ($plugin, $pmethod) = explode(PluginHost::PUBLIC_METHOD_DELIMITER, $op, 2);

		// TODO: better implementation that won't modify $_REQUEST
		$_REQUEST["plugin"] = $plugin;
		$method = $pmethod;
		$op = "pluginhandler";
	} */

	$op = str_replace("-", "_", $op);

	$override = PluginHost::getInstance()->lookup_handler($op, $method);

	if (class_exists($op) || $override) {

		if (strpos($method, "_") === 0) {
			user_error("Refusing to invoke method $method of handler $op which starts with underscore.", E_USER_WARNING);
			header("Content-Type: text/json");
			print Errors::to_json(Errors::E_UNAUTHORIZED);
			return;
		}

		if ($override) {
			$handler = $override;
		} else {
			$reflection = new ReflectionClass($op);
			$handler = $reflection->newInstanceWithoutConstructor();
		}

		if ($handler && implements_interface($handler, 'IHandler')) {
			$handler->__construct($_REQUEST);

			if (validate_csrf($csrf_token) || $handler->csrf_ignore($method)) {
				if ($handler->before($method)) {
					if ($method && method_exists($handler, $method)) {
						$reflection = new ReflectionMethod($handler, $method);

						if ($reflection->getNumberOfRequiredParameters() == 0) {
							$handler->$method();
						} else {
							user_error("Refusing to invoke method $method of handler $op which has required parameters.", E_USER_WARNING);
							header("Content-Type: text/json");
							print Errors::to_json(Errors::E_UNAUTHORIZED);
						}
					} else {
						if (method_exists($handler, "catchall")) {
							$handler->catchall($method);
						} else {
							header("Content-Type: text/json");
							print Errors::to_json(Errors::E_UNKNOWN_METHOD, ["info" => get_class($handler) . "->$method"]);
						}
					}
					$handler->after();
					return;
				} else {
					header("Content-Type: text/json");
					print Errors::to_json(Errors::E_UNAUTHORIZED);
					return;
				}
			} else {
				user_error("Refusing to invoke method $method of handler $op with invalid CSRF token.", E_USER_WARNING);
				header("Content-Type: text/json");
				print Errors::to_json(Errors::E_UNAUTHORIZED);
				return;
			}
		}
	}

	header("Content-Type: text/json");
	print Errors::to_json(Errors::E_UNKNOWN_METHOD, [ "info" => (isset($handler) ? get_class($handler) : "UNKNOWN:".$_REQUEST["op"]) . "->$method"]);

?>
