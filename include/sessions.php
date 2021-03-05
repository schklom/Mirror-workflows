<?php
	namespace Sessions;

	require_once "autoload.php";
	require_once "functions.php";
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

	function validate_session() {
		if (\Config::get(\Config::SINGLE_USER_MODE)) return true;

		$pdo = \Db::pdo();

		if (!empty($_SESSION["uid"])) {
			$user = \ORM::for_table('ttrss_users')->find_one($_SESSION["uid"]);

			if ($user) {
				if ($user->pwd_hash != $_SESSION["pwd_hash"]) {
					$_SESSION["login_error_msg"] = __("Session failed to validate (password changed)");
					return false;
				}
			} else {
				$_SESSION["login_error_msg"] = __("Session failed to validate (user not found)");
				return false;
			}
		}

		return true;
	}

	function ttrss_open ($s, $n) {
		return true;
	}

	function ttrss_read ($id){
		global $session_expire;

		$sth = \Db::pdo()->prepare("SELECT data FROM ttrss_sessions WHERE id=?");
		$sth->execute([$id]);

		if ($row = $sth->fetch()) {
				return base64_decode($row["data"]);

		} else {
				$expire = time() + $session_expire;

				$sth = \Db::pdo()->prepare("INSERT INTO ttrss_sessions (id, data, expire)
					VALUES (?, '', ?)");
				$sth->execute([$id, $expire]);

				return "";

		}

	}

	function ttrss_write ($id, $data) {
		global $session_expire;

		$data = base64_encode($data);
		$expire = time() + $session_expire;

		$sth = \Db::pdo()->prepare("SELECT id FROM ttrss_sessions WHERE id=?");
		$sth->execute([$id]);

		if ($row = $sth->fetch()) {
			$sth = \Db::pdo()->prepare("UPDATE ttrss_sessions SET data=?, expire=? WHERE id=?");
			$sth->execute([$data, $expire, $id]);
		} else {
			$sth = \Db::pdo()->prepare("INSERT INTO ttrss_sessions (id, data, expire)
				VALUES (?, ?, ?)");
			$sth->execute([$id, $data, $expire]);
		}

		return true;
	}

	function ttrss_close () {
		return true;
	}

	function ttrss_destroy($id) {
		$sth = \Db::pdo()->prepare("DELETE FROM ttrss_sessions WHERE id = ?");
		$sth->execute([$id]);

		return true;
	}

	function ttrss_gc ($expire) {
		\Db::pdo()->query("DELETE FROM ttrss_sessions WHERE expire < " . time());

		return true;
	}

	if (\Config::get_schema_version() >= 0) {
		if (!\Config::get(\Config::SINGLE_USER_MODE)) {
			session_set_save_handler('\Sessions\ttrss_open',
				'\Sessions\ttrss_close', '\Sessions\ttrss_read',
				'\Sessions\ttrss_write', '\Sessions\ttrss_destroy',
				'\Sessions\ttrss_gc');
			register_shutdown_function('session_write_close');
		}

		if (!defined('NO_SESSION_AUTOSTART')) {
			if (isset($_COOKIE[session_name()])) {
				if (session_status() != PHP_SESSION_ACTIVE)
						session_start();
			}
		}
	}
