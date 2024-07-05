<?php
	namespace Sessions;

	use UserHelper;

	require_once "autoload.php";
	require_once "errorhandler.php";
	require_once "lib/gettext/gettext.inc.php";

	$session_expire = min(2147483647 - time() - 1, max(\Config::get(\Config::SESSION_COOKIE_LIFETIME), 86400));
	$session_name = \Config::get(\Config::SESSION_NAME);

	if (\Config::is_server_https()) {
		ini_set("session.cookie_secure", "true");
	}

	ini_set("session.gc_probability", "75");
	ini_set("session.name", $session_name);
	ini_set("session.use_only_cookies", "true");
	ini_set("session.gc_maxlifetime", $session_expire);
	ini_set("session.cookie_lifetime", "0");

	// prolong PHP session cookie
	if (isset($_COOKIE[$session_name]))
		setcookie($session_name,
			$_COOKIE[$session_name],
			time() + $session_expire,
			ini_get("session.cookie_path"),
			ini_get("session.cookie_domain"),
			ini_get("session.cookie_secure"),
			ini_get("session.cookie_httponly"));

	function validate_session(): bool {
		if (\Config::get(\Config::SINGLE_USER_MODE)) return true;

		$pdo = \Db::pdo();

		if (!empty($_SESSION["uid"])) {
			$user = \ORM::for_table('ttrss_users')->find_one($_SESSION["uid"]);

			if ($user) {
				if ($user->pwd_hash != $_SESSION["pwd_hash"]) {
					$_SESSION["login_error_msg"] = __("Session failed to validate (password changed)");
					return false;
				}

				if ($user->access_level == UserHelper::ACCESS_LEVEL_DISABLED) {
					$_SESSION["login_error_msg"] = __("Session failed to validate (account is disabled)");
					return false;
				}

				// default to true because there might not be any hooks and this is our last check
				$hook_result = true;

				\PluginHost::getInstance()->chain_hooks_callback(\PluginHost::HOOK_VALIDATE_SESSION,
					function ($result) use (&$hook_result) {
						$hook_result = $result;

						if (!$result) {
							return true;
						}
					});

				return $hook_result;

			} else {
				$_SESSION["login_error_msg"] = __("Session failed to validate (user not found)");
				return false;
			}
		}

		return true;
	}

	if (\Config::get_schema_version() >= 0) {
		// TODO: look into making these behave closer to what SessionHandlerInterface intends
		session_set_save_handler(new class() implements \SessionHandlerInterface {
			public function open(string $path, string $name): bool {
				return true;
			}

			public function close(): bool {
				return true;
			}

			/**
			 * @todo set return type to string|false, and remove ReturnTypeWillChange, when min supported is PHP 8
			 * @return string|false
			 */
			#[\ReturnTypeWillChange]
			public function read(string $id) {
				global $session_expire;

				$sth = \Db::pdo()->prepare('SELECT data FROM ttrss_sessions WHERE id=?');
				$sth->execute([$id]);

				if ($row = $sth->fetch()) {
					return base64_decode($row['data']);
				}

				$expire = time() + $session_expire;

				$sth = \Db::pdo()->prepare("INSERT INTO ttrss_sessions (id, data, expire)
					VALUES (?, '', ?)");
				return $sth->execute([$id, $expire]) ? '' : false;
			}

			public function write(string $id, string $data): bool {
				global $session_expire;

				$data = base64_encode($data);
				$expire = time() + $session_expire;

				$sth = \Db::pdo()->prepare('SELECT id FROM ttrss_sessions WHERE id=?');
				$sth->execute([$id]);

				if ($sth->fetch()) {
					$sth = \Db::pdo()->prepare('UPDATE ttrss_sessions SET data=?, expire=? WHERE id=?');
					return $sth->execute([$data, $expire, $id]);
				}

				$sth = \Db::pdo()->prepare('INSERT INTO ttrss_sessions (id, data, expire) VALUES (?, ?, ?)');
				return $sth->execute([$id, $data, $expire]);
			}

			public function destroy(string $id): bool {
				$sth = \Db::pdo()->prepare('DELETE FROM ttrss_sessions WHERE id = ?');
				return $sth->execute([$id]);
			}

			/**
			 * @todo set return type to int|false, and remove ReturnTypeWillChange, when min supported is PHP 8
			 * @return int|false the number of deleted sessions on success, or false on failure
			 */
			#[\ReturnTypeWillChange]
			public function gc(int $max_lifetime) {
				$result = \Db::pdo()->query('DELETE FROM ttrss_sessions WHERE expire < ' . time());
				return $result === false ? false : $result->rowCount();
			}
		});

		if (!defined('NO_SESSION_AUTOSTART')) {
			if (isset($_COOKIE[session_name()])) {
				if (session_status() != PHP_SESSION_ACTIVE)
						session_start();
			}
		}
	}
