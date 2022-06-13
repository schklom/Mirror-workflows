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

	const ACCESS_LEVELS = [
		self::ACCESS_LEVEL_DISABLED,
		self::ACCESS_LEVEL_READONLY,
		self::ACCESS_LEVEL_USER,
		self::ACCESS_LEVEL_POWERUSER,
		self::ACCESS_LEVEL_ADMIN,
		self::ACCESS_LEVEL_KEEP_CURRENT
	];

	/** forbidden to login */
	const ACCESS_LEVEL_DISABLED 		= -2;

	/** can't subscribe to new feeds, feeds are not updated */
	const ACCESS_LEVEL_READONLY		= -1;

	/** no restrictions, regular user */
	const ACCESS_LEVEL_USER				= 0;

	/** not used, same as regular user */
	const ACCESS_LEVEL_POWERUSER		= 5;

	/** has administrator permissions */
	const ACCESS_LEVEL_ADMIN			= 10;

	/** used by self::user_modify() to keep current access level */
	const ACCESS_LEVEL_KEEP_CURRENT = -1024;

	/**
	 * @param int $level integer loglevel value
	 * @return UserHelper::ACCESS_LEVEL_* if valid, warn and return ACCESS_LEVEL_KEEP_CURRENT otherwise
	 */
	public static function map_access_level(int $level) : int {
		if (in_array($level, self::ACCESS_LEVELS)) {
			/** @phpstan-ignore-next-line */
			return $level;
		} else {
			user_error("Passed invalid user access level: $level", E_USER_WARNING);
			return self::ACCESS_LEVEL_KEEP_CURRENT;
		}
	}

	static function authenticate(string $login = null, string $password = null, bool $check_only = false, string $service = null): bool {
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

				if ($user && $user->access_level != self::ACCESS_LEVEL_DISABLED) {
					$_SESSION["uid"] = $user_id;
					$_SESSION["auth_module"] = $auth_module;
					$_SESSION["name"] = $user->login;
					$_SESSION["access_level"] = $user->access_level;
					$_SESSION["csrf_token"] = bin2hex(get_random_bytes(16));
					$_SESSION["ip_address"] = UserHelper::get_user_ip();
					$_SESSION["pwd_hash"] = $user->pwd_hash;

					$user->last_login = Db::NOW();
					$user->save();

					$_SESSION["last_login_update"] = time();

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
			$_SESSION["access_level"] = self::ACCESS_LEVEL_ADMIN;

			$_SESSION["hide_hello"] = true;
			$_SESSION["hide_logout"] = true;

			$_SESSION["auth_module"] = false;

			if (empty($_SESSION["csrf_token"]))
				$_SESSION["csrf_token"] = bin2hex(get_random_bytes(16));

			$_SESSION["ip_address"] = UserHelper::get_user_ip();

			return true;
		}
	}

	static function load_user_plugins(int $owner_uid, PluginHost $pluginhost = null): void {

		if (!$pluginhost) $pluginhost = PluginHost::getInstance();

		if ($owner_uid && Config::get_schema_version() >= 100 && empty($_SESSION["safe_mode"])) {
			$plugins = get_pref(Prefs::_ENABLED_PLUGINS, $owner_uid);

			$pluginhost->load((string)$plugins, PluginHost::KIND_USER, $owner_uid);

			/*if (get_schema_version() > 100) {
				$pluginhost->load_data();
			}*/
		}
	}

	static function login_sequence(): void {
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
					$_SESSION["ref_schema_version"] = Config::get_schema_version();
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

	static function print_user_stylesheet(): void {
		$value = get_pref(Prefs::USER_STYLESHEET);

		if ($value) {
			print "<style type='text/css' id='user_css_style'>";
			print str_replace("<br/>", "\n", $value);
			print "</style>";
		}

	}

	static function get_user_ip(): ?string {
		foreach (["HTTP_X_REAL_IP", "REMOTE_ADDR"] as $hdr) {
			if (isset($_SERVER[$hdr]))
				return $_SERVER[$hdr];
		}

		return null;
	}

	static function get_login_by_id(int $id): ?string {
		$user = ORM::for_table('ttrss_users')
			->find_one($id);

		if ($user)
			return $user->login;
		else
			return null;
	}

	static function find_user_by_login(string $login): ?int {
		$user = ORM::for_table('ttrss_users')
			->where('login', $login)
			->find_one();

		if ($user)
			return $user->id;
		else
			return null;
	}

	static function logout(): void {
		if (session_status() === PHP_SESSION_ACTIVE)
			session_destroy();

		if (isset($_COOKIE[session_name()])) {
		   setcookie(session_name(), '', time()-42000, '/');

		}
		session_commit();
	}

	static function get_salt(): string {
		return substr(bin2hex(get_random_bytes(125)), 0, 250);
	}

	/** TODO: this should invoke UserHelper::user_modify() */
	static function reset_password(int $uid, bool $format_output = false, string $new_password = ""): void {

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

	static function get_otp_secret(int $owner_uid, bool $show_if_enabled = false): ?string {
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
						$user->otp_secret = bin2hex(get_random_bytes(10));
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

	/**
	 * @param null|int $owner_uid if null, checks current user via session-specific auth module, if set works on internal database only
	 * @return bool
	 * @throws PDOException
	 * @throws Exception
	 */
	static function is_default_password(?int $owner_uid = null): bool {
		return self::user_has_password($owner_uid, 'password');
	}

	/**
	 * @param string $algo should be one of UserHelper::HASH_ALGO_*
	 *
	 * @return false|string False if the password couldn't be hashed, otherwise the hash string.
	 */
	static function hash_password(string $pass, string $salt, string $algo = self::HASH_ALGOS[0]) {
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

	/**
	 * @param string $login Login for new user (case-insensitive)
	 * @param string $password Password for new user (may not be blank)
	 * @param UserHelper::ACCESS_LEVEL_* $access_level Access level for new user
	 * @return bool true if user has been created
	 */
	static function user_add(string $login, string $password, int $access_level) : bool {
		$login = clean($login);

		if ($login &&
			$password &&
			!self::find_user_by_login($login) &&
			self::map_access_level((int)$access_level) != self::ACCESS_LEVEL_KEEP_CURRENT) {

			$user = ORM::for_table('ttrss_users')->create();

			$user->salt = self::get_salt();
			$user->login = mb_strtolower($login);
			$user->pwd_hash = self::hash_password($password, $user->salt);
			$user->access_level = $access_level;
			$user->created = Db::NOW();

			return $user->save();
		}

		return false;
	}

	/**
	 * @param int $uid User ID to modify
	 * @param string $new_password set password to this value if its not blank
	 * @param UserHelper::ACCESS_LEVEL_* $access_level set user access level to this value if it is set (default ACCESS_LEVEL_KEEP_CURRENT)
	 * @return bool true if user record has been saved
	 *
	 * NOTE: $access_level is of mixed type because of intellephense
	 */
	static function user_modify(int $uid, string $new_password = '', $access_level = self::ACCESS_LEVEL_KEEP_CURRENT) : bool {
		$user = ORM::for_table('ttrss_users')->find_one($uid);

		if ($user) {
			if ($new_password != '') {
				$new_salt = self::get_salt();
				$pwd_hash = self::hash_password($new_password, $new_salt, self::HASH_ALGOS[0]);

				$user->pwd_hash = $pwd_hash;
				$user->salt = $new_salt;
			}

			if ($access_level != self::ACCESS_LEVEL_KEEP_CURRENT) {
				$user->access_level = (int)$access_level;
			}

			return $user->save();
		}

		return false;
	}

	/**
	 * @param int $uid user ID to delete (this won't delete built-in admin user with UID 1)
	 * @return bool true if user has been deleted
	 */
	static function user_delete(int $uid) : bool {
		if ($uid != 1) {

			$user = ORM::for_table('ttrss_users')->find_one($uid);

			if ($user) {
				// TODO: is it still necessary to split those queries?

				ORM::for_table('ttrss_tags')
					->where('owner_uid', $uid)
					->delete_many();

				ORM::for_table('ttrss_feeds')
					->where('owner_uid', $uid)
					->delete_many();

				return $user->delete();
			}
		}

		return false;
	}

	/**
	 * @param null|int $owner_uid if null, checks current user via session-specific auth module, if set works on internal database only
	 * @param string $password password to compare hash against
	 * @return bool
	 */
	static function user_has_password(?int $owner_uid, string $password) : bool {
		if ($owner_uid) {
			$authenticator = new Auth_Internal();

			return $authenticator->check_password($owner_uid, $password);
		} else {
			/** @var Auth_Internal|false $authenticator -- this is only here to make check_password() visible to static analyzer */
			$authenticator = PluginHost::getInstance()->get_plugin($_SESSION["auth_module"]);

			if ($authenticator &&
						method_exists($authenticator, "check_password") &&
						$authenticator->check_password($_SESSION["uid"], $password)) {

				return true;
			}
		}

		return false;
	}

}
