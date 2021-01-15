<?php
class UserHelper {

	static function authenticate($login, $password, $check_only = false, $service = false) {

		if (!SINGLE_USER_MODE) {
			$user_id = false;
			$auth_module = false;

			foreach (PluginHost::getInstance()->get_hooks(PluginHost::HOOK_AUTH_USER) as $plugin) {

				$user_id = (int) $plugin->authenticate($login, $password, $service);

				if ($user_id) {
					$auth_module = strtolower(get_class($plugin));
					break;
				}
			}

			if ($user_id && !$check_only) {

				session_start();
				session_regenerate_id(true);

				$_SESSION["uid"] = $user_id;
				$_SESSION["auth_module"] = $auth_module;

				$pdo = Db::pdo();
				$sth = $pdo->prepare("SELECT login,access_level,pwd_hash FROM ttrss_users
					WHERE id = ?");
				$sth->execute([$user_id]);
				$row = $sth->fetch();

				$_SESSION["name"] = $row["login"];
				$_SESSION["access_level"] = $row["access_level"];
				$_SESSION["csrf_token"] = bin2hex(get_random_bytes(16));

				$usth = $pdo->prepare("UPDATE ttrss_users SET last_login = NOW() WHERE id = ?");
				$usth->execute([$user_id]);

				$_SESSION["ip_address"] = UserHelper::get_user_ip();
				$_SESSION["user_agent"] = sha1($_SERVER['HTTP_USER_AGENT']);
				$_SESSION["pwd_hash"] = $row["pwd_hash"];

				Pref_Prefs::initialize_user_prefs($_SESSION["uid"]);

				return true;
			}

			return false;

		} else {

			$_SESSION["uid"] = 1;
			$_SESSION["name"] = "admin";
			$_SESSION["access_level"] = 10;

			$_SESSION["hide_hello"] = true;
			$_SESSION["hide_logout"] = true;

			$_SESSION["auth_module"] = false;

			if (!$_SESSION["csrf_token"])
				$_SESSION["csrf_token"] = bin2hex(get_random_bytes(16));

			$_SESSION["ip_address"] = UserHelper::get_user_ip();

			Pref_Prefs::initialize_user_prefs($_SESSION["uid"]);

			return true;
		}
	}

	static function load_user_plugins($owner_uid, $pluginhost = false) {

		if (!$pluginhost) $pluginhost = PluginHost::getInstance();

		if ($owner_uid && SCHEMA_VERSION >= 100 && !$_SESSION["safe_mode"]) {
			$plugins = get_pref("_ENABLED_PLUGINS", $owner_uid);

			$pluginhost->load($plugins, PluginHost::KIND_USER, $owner_uid);

			/*if (get_schema_version() > 100) {
				$pluginhost->load_data();
			}*/
		}
	}

	static function login_sequence() {
		$pdo = Db::pdo();

		if (SINGLE_USER_MODE) {
			@session_start();
			self::authenticate("admin", null);
			startup_gettext();
			self::load_user_plugins($_SESSION["uid"]);
		} else {
			if (!validate_session()) $_SESSION["uid"] = false;

			if (!$_SESSION["uid"]) {

				if (AUTH_AUTO_LOGIN && self::authenticate(null, null)) {
					$_SESSION["ref_schema_version"] = get_schema_version(true);
				} else {
					 self::authenticate(null, null, true);
				}

				if (!$_SESSION["uid"]) {
					Pref_Users::logout_user();

					Handler_Public::render_login_form();
					exit;
				}

			} else {
				/* bump login timestamp */
				$sth = $pdo->prepare("UPDATE ttrss_users SET last_login = NOW() WHERE id = ?");
				$sth->execute([$_SESSION['uid']]);

				$_SESSION["last_login_update"] = time();
			}

			if ($_SESSION["uid"]) {
				startup_gettext();
				self::load_user_plugins($_SESSION["uid"]);
			}
		}
	}

	static function print_user_stylesheet() {
		$value = get_pref('USER_STYLESHEET');

		if ($value) {
			print "<style type='text/css' id='user_css_style'>";
			print str_replace("<br/>", "\n", $value);
			print "</style>";
		}

	}

	static function get_user_ip() {
		foreach (["HTTP_X_REAL_IP", "REMOTE_ADDR"] as $hdr) {
			if (isset($_SERVER[$hdr]))
				return $_SERVER[$hdr];
		}
	}

}
