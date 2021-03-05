<?php
use OTPHP\TOTP;

class UserHelper {

	const HASH_ALGO_SSHA512 = 'SSHA-512';
	const HASH_ALGO_SSHA256 = 'SSHA-256';
	const HASH_ALGO_MODE2   = 'MODE2';
	const HASH_ALGO_SHA1X   = 'SHA1X';
	const HASH_ALGO_SHA1    = 'SHA1';

	const HASH_ALGOS = [
		self::HASH_ALGO_SSHA512,
		self::HASH_ALGO_SSHA256,
		self::HASH_ALGO_MODE2,
		self::HASH_ALGO_SHA1X,
		self::HASH_ALGO_SHA1
	];

	static function authenticate(string $login = null, string $password = null, bool $check_only = false, string $service = null) {
		if (!Config::get(Config::SINGLE_USER_MODE)) {
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

				if (session_status() != PHP_SESSION_ACTIVE)
					session_start();

				session_regenerate_id(true);

				$user = ORM::for_table('ttrss_users')->find_one($user_id);

				if ($user) {
					$_SESSION["uid"] = $user_id;
					$_SESSION["auth_module"] = $auth_module;
					$_SESSION["name"] = $user->login;
					$_SESSION["access_level"] = $user->access_level;
					$_SESSION["csrf_token"] = bin2hex(get_random_bytes(16));
					$_SESSION["ip_address"] = UserHelper::get_user_ip();
					$_SESSION["pwd_hash"] = $user->pwd_hash;

					$user->last_login = Db::NOW();
					$user->save();

					return true;
				}

				return false;
			}

			if ($login && $password && !$user_id && !$check_only)
				Logger::log(E_USER_WARNING, "Failed login attempt for $login (service: $service) from " . UserHelper::get_user_ip());

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

			return true;
		}
	}

	static function load_user_plugins(int $owner_uid, PluginHost $pluginhost = null) {

		if (!$pluginhost) $pluginhost = PluginHost::getInstance();

		if ($owner_uid && Config::get_schema_version() >= 100 && empty($_SESSION["safe_mode"])) {
			$plugins = get_pref(Prefs::_ENABLED_PLUGINS, $owner_uid);

			$pluginhost->load((string)$plugins, PluginHost::KIND_USER, $owner_uid);

			/*if (get_schema_version() > 100) {
				$pluginhost->load_data();
			}*/
		}
	}

	static function login_sequence() {
		$pdo = Db::pdo();

		if (Config::get(Config::SINGLE_USER_MODE)) {
			if (session_status() != PHP_SESSION_ACTIVE)
					session_start();

			self::authenticate("admin", null);
			startup_gettext();
			self::load_user_plugins($_SESSION["uid"]);
		} else {
			if (!\Sessions\validate_session())
				$_SESSION["uid"] = null;

			if (empty($_SESSION["uid"])) {

				if (Config::get(Config::AUTH_AUTO_LOGIN) && self::authenticate(null, null)) {
					$_SESSION["ref_schema_version"] = get_schema_version();
				} else {
					 self::authenticate(null, null, true);
				}

				if (empty($_SESSION["uid"])) {
					UserHelper::logout();

					Handler_Public::_render_login_form();
					exit;
				}

			} else {
				/* bump login timestamp */
				$user = ORM::for_table('ttrss_users')->find_one($_SESSION["uid"]);
				$user->last_login = Db::NOW();
				$user->save();

				$_SESSION["last_login_update"] = time();
			}

			if ($_SESSION["uid"]) {
				startup_gettext();
				self::load_user_plugins($_SESSION["uid"]);
			}
		}
	}

	static function print_user_stylesheet() {
		$value = get_pref(Prefs::USER_STYLESHEET);

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

		return null;
	}

	static function get_login_by_id(int $id) {
		$user = ORM::for_table('ttrss_users')
			->find_one($id);

		if ($user)
			return $user->login;
		else
			return null;
	}

	static function find_user_by_login(string $login) {
		$user = ORM::for_table('ttrss_users')
			->where('login', $login)
			->find_one();

		if ($user)
			return $user->id;
		else
			return null;
	}

	static function logout() {
		if (session_status() === PHP_SESSION_ACTIVE)
			session_destroy();

		if (isset($_COOKIE[session_name()])) {
		   setcookie(session_name(), '', time()-42000, '/');

		}
		session_commit();
	}

	static function get_salt() {
		return substr(bin2hex(get_random_bytes(125)), 0, 250);
	}

	static function reset_password($uid, $format_output = false, $new_password = "") {

		$user = ORM::for_table('ttrss_users')->find_one($uid);
		$message = "";

		if ($user) {

			$login = $user->login;

			$new_salt = self::get_salt();
			$tmp_user_pwd = $new_password ? $new_password : make_password();

			$pwd_hash = self::hash_password($tmp_user_pwd, $new_salt, self::HASH_ALGOS[0]);

			$user->pwd_hash = $pwd_hash;
			$user->salt = $new_salt;
			$user->save();

			$message = T_sprintf("Changed password of user %s to %s", "<strong>$login</strong>", "<strong>$tmp_user_pwd</strong>");
		} else {
			$message = __("User not found");
		}

		if ($format_output)
			print_notice($message);
		else
			print $message;
	}

	static function check_otp(int $owner_uid, int $otp_check) : bool {
		$otp = TOTP::create(self::get_otp_secret($owner_uid, true));

		return $otp->now()  == $otp_check;
	}

	static function disable_otp(int $owner_uid) : bool {
		$user = ORM::for_table('ttrss_users')->find_one($owner_uid);

		if ($user) {
			$user->otp_enabled = false;

			// force new OTP secret when next enabled
			if (Config::get_schema_version() >= 143) {
				$user->otp_secret = null;
			}

			$user->save();

			return true;
		} else {
			return false;
		}
	}

	static function enable_otp(int $owner_uid, int $otp_check) : bool {
		$secret = self::get_otp_secret($owner_uid);

		if ($secret) {
			$otp = TOTP::create($secret);
			$user = ORM::for_table('ttrss_users')->find_one($owner_uid);

			if ($otp->now() == $otp_check && $user) {

				$user->otp_enabled = true;
				$user->save();

				return true;
			}
		}
		return false;
	}


	static function is_otp_enabled(int $owner_uid) : bool {
		$user = ORM::for_table('ttrss_users')->find_one($owner_uid);

		if ($user) {
			return $user->otp_enabled;
		} else {
			return false;
		}
	}

	static function get_otp_secret(int $owner_uid, bool $show_if_enabled = false) {
		$user = ORM::for_table('ttrss_users')->find_one($owner_uid);

		if ($user) {

			$salt_based_secret = mb_substr(sha1($user->salt), 0, 12);

			if (Config::get_schema_version() >= 143) {
				$secret = $user->otp_secret;

				if (empty($secret)) {

					/* migrate secret if OTP is already enabled, otherwise make a new one */
					if ($user->otp_enabled) {
						$user->otp_secret = $salt_based_secret;
					} else {
						$user->otp_secret = bin2hex(get_random_bytes(6));
					}

					$user->save();

					$secret = $user->otp_secret;
				}
			} else {
				$secret = $salt_based_secret;
			}

			if (!$user->otp_enabled || $show_if_enabled) {
				return \ParagonIE\ConstantTime\Base32::encodeUpperUnpadded($secret);
			}
		}

		return null;
	}

	static function is_default_password() {
		$authenticator = PluginHost::getInstance()->get_plugin($_SESSION["auth_module"]);

		if ($authenticator &&
                method_exists($authenticator, "check_password") &&
                $authenticator->check_password($_SESSION["uid"], "password")) {

			return true;
		}
		return false;
	}

	static function hash_password(string $pass, string $salt, string $algo = "") {

		if (!$algo) $algo = self::HASH_ALGOS[0];

		$pass_hash = "";

		switch ($algo) {
			case self::HASH_ALGO_SHA1:
				$pass_hash = sha1($pass);
				break;
			case self::HASH_ALGO_SHA1X:
				$pass_hash = sha1("$salt:$pass");
				break;
			case self::HASH_ALGO_MODE2:
			case self::HASH_ALGO_SSHA256:
				$pass_hash = hash('sha256', $salt . $pass);
				break;
			case self::HASH_ALGO_SSHA512:
				$pass_hash = hash('sha512', $salt . $pass);
				break;
			default:
				user_error("hash_password: unknown hash algo: $algo", E_USER_ERROR);
		}

		if ($pass_hash)
			return "$algo:$pass_hash";
		else
			return false;
	}
}
