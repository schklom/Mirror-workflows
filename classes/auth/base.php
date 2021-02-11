<?php
abstract class Auth_Base extends Plugin implements IAuthModule {
	protected $pdo;

	const AUTH_SERVICE_API = '_api';

	function __construct() {
		$this->pdo = Db::pdo();
	}

	// compatibility wrapper, because of how pluginhost works (hook name == method name)
	function hook_auth_user(...$args) {
		return $this->authenticate(...$args);
	}

	// Auto-creates specified user if allowed by system configuration
	// Can be used instead of find_user_by_login() by external auth modules
	function auto_create_user(string $login, $password = false) {
		if ($login && defined('AUTH_AUTO_CREATE') && AUTH_AUTO_CREATE) {
			$user_id = UserHelper::find_user_by_login($login);

			if (!$user_id) {

				if (!$password) $password = make_password();

				$salt = substr(bin2hex(get_random_bytes(125)), 0, 250);
				$pwd_hash = encrypt_password($password, $salt, true);

				$sth = $this->pdo->prepare("INSERT INTO ttrss_users
						(login,access_level,last_login,created,pwd_hash,salt)
						VALUES (LOWER(?), 0, null, NOW(), ?,?)");
				$sth->execute([$login, $pwd_hash, $salt]);

				return UserHelper::find_user_by_login($login);

			} else {
				return $user_id;
			}
		}

		return UserHelper::find_user_by_login($login);
	}

	// @deprecated
	function find_user_by_login(string $login) {
		return UserHelper::find_user_by_login($login);
	}
}
