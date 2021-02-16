<?php
class UserHelper {

	static function authenticate(string $login = null, string $password = null, bool $check_only = false, string $service = null) {
		if (!SINGLE_USER_MODE) {
			$user_id = false;
			$auth_module = false;

			PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_AUTH_USER,
				function ($result, $plugin) use (&$user_id, &$auth_module) {
					if ($result) {
						$user_id = (int)$result;
						$auth_module = strtolower(get_class($plugin));
						return true;
					}
				},
				$login, $password, $service);

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

				Pref_Prefs::_init_user_prefs($_SESSION["uid"]);

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

			Pref_Prefs::_init_user_prefs($_SESSION["uid"]);

			return true;
		}
	}

	static function load_user_plugins(int $owner_uid, PluginHost $pluginhost = null) {

		if (!$pluginhost) $pluginhost = PluginHost::getInstance();

		if ($owner_uid && SCHEMA_VERSION >= 100 && empty($_SESSION["safe_mode"])) {
			$plugins = get_pref("_ENABLED_PLUGINS", $owner_uid);

			$pluginhost->load((string)$plugins, PluginHost::KIND_USER, $owner_uid);

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
			if (!\Sessions\validate_session()) $_SESSION["uid"] = false;

			if (empty($_SESSION["uid"])) {

				if (AUTH_AUTO_LOGIN && self::authenticate(null, null)) {
					$_SESSION["ref_schema_version"] = get_schema_version(true);
				} else {
					 self::authenticate(null, null, true);
				}

				if (empty($_SESSION["uid"])) {
					UserHelper::logout();

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

	static function find_user_by_login(string $login) {
		$pdo = Db::pdo();

		$sth = $pdo->prepare("SELECT id FROM ttrss_users WHERE
			LOWER(login) = LOWER(?)");
		$sth->execute([$login]);

		if ($row = $sth->fetch()) {
			return $row["id"];
		}

		return false;
	}

	static function logout() {
		if (session_status() === PHP_SESSION_ACTIVE)
			session_destroy();

		if (isset($_COOKIE[session_name()])) {
		   setcookie(session_name(), '', time()-42000, '/');

		}
		session_commit();
	}

	static function reset_password($uid, $format_output = false) {

		$pdo = Db::pdo();

		$sth = $pdo->prepare("SELECT login FROM ttrss_users WHERE id = ?");
		$sth->execute([$uid]);

		if ($row = $sth->fetch()) {

			$login = $row["login"];

			$new_salt = substr(bin2hex(get_random_bytes(125)), 0, 250);
			$tmp_user_pwd = make_password();

			$pwd_hash = encrypt_password($tmp_user_pwd, $new_salt, true);

			$sth = $pdo->prepare("UPDATE ttrss_users
				  SET pwd_hash = ?, salt = ?, otp_enabled = false
				WHERE id = ?");
			$sth->execute([$pwd_hash, $new_salt, $uid]);

			$message = T_sprintf("Changed password of user %s to %s", "<strong>$login</strong>", "<strong>$tmp_user_pwd</strong>");

			if ($format_output)
				print_notice($message);
			else
				print $message;

		}
	}
}
