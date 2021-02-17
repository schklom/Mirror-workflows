<?php
class PluginHandler extends Handler_Protected {
	function csrf_ignore($method) {
		return true;
	}

	function catchall($method) {
		$plugin_name = clean($_REQUEST["plugin"]);
		$plugin = PluginHost::getInstance()->get_plugin($plugin_name);
		$csrf_token = ($_POST["csrf_token"] ?? "");

		if ($plugin) {
			if (method_exists($plugin, $method)) {
				if (validate_csrf($csrf_token) || $plugin->csrf_ignore($method)) {
					$plugin->$method();
				} else {
					user_error("Rejected ${plugin_name}->${method}(): invalid CSRF token.", E_USER_WARNING);
					print error_json(6);
				}
			} else {
				user_error("Rejected ${plugin_name}->${method}(): unknown method.", E_USER_WARNING);
				print error_json(13);
			}
		} else {
			user_error("Rejected ${plugin_name}->${method}(): unknown plugin.", E_USER_WARNING);
			print error_json(14);
		}
	}
}
