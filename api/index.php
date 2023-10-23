<?php
	error_reporting(E_ERROR | E_PARSE);

	set_include_path(__DIR__ . PATH_SEPARATOR .
		dirname(__DIR__) . PATH_SEPARATOR .
		dirname(__DIR__) . "/include" . PATH_SEPARATOR .
  		get_include_path());

	chdir("..");

	define('NO_SESSION_AUTOSTART', true);

	require_once "autoload.php";
	require_once "functions.php";
	require_once "sessions.php";

	ini_set('session.use_cookies', "0");
	ini_set("session.gc_maxlifetime", "86400");

	ob_start();

	$_REQUEST = json_decode((string)file_get_contents("php://input"), true);

	if (!empty($_REQUEST["sid"])) {
		session_id($_REQUEST["sid"]);
		session_start();
	}

	startup_gettext();

	if (!init_plugins()) return;

	if (!empty($_SESSION["uid"])) {
		if (!\Sessions\validate_session()) {
			header("Content-Type: text/json");

			print json_encode([
						"seq" => -1,
						"status" => API::STATUS_ERR,
						"content" => [ "error" => API::E_NOT_LOGGED_IN ]
					]);

			return;
		}

		UserHelper::load_user_plugins($_SESSION["uid"]);
	}

	$method = strtolower($_REQUEST["op"] ?? "");

	$handler = new API($_REQUEST);

	if ($handler->before($method)) {
		if ($method && method_exists($handler, $method)) {
			$handler->$method();
		} else /* if (method_exists($handler, 'index')) */ {
			$handler->index($method);
		}
		$handler->after();
	}

	header("Api-Content-Length: " . ob_get_length());

	ob_end_flush();

