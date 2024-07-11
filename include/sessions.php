<?php
namespace Sessions;

require_once 'autoload.php';
require_once 'errorhandler.php';

$sessions = new \Sessions;

if (\Config::get_schema_version() >= 0) {
	session_set_save_handler($sessions);

	if (!defined('NO_SESSION_AUTOSTART')) {
		if (isset($_COOKIE[session_name()])) {
			if (session_status() != PHP_SESSION_ACTIVE)
					session_start();
		}
	}
}
