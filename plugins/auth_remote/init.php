<?php
class Auth_Remote extends Auth_Base {

	private $host;

	function about() {
		return array(null,
			"Authenticates against remote password (e.g. supplied by Apache)",
			"fox",
			true);
	}

	/* @var PluginHost $host */
	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_AUTH_USER, $this);
	}

	function get_login_by_ssl_certificate() {
		$cert_serial = Pref_Prefs::_get_ssl_certificate_id();

		if ($cert_serial) {
			$sth = $this->pdo->prepare("SELECT login FROM ttrss_user_prefs2, ttrss_users
				WHERE pref_name = 'SSL_CERT_SERIAL' AND value = ? AND
				owner_uid = ttrss_users.id");
			$sth->execute([$cert_serial]);

			if ($row = $sth->fetch()) {
				return $row['login'];
			}
		}

		return "";
	}

	function authenticate($login, $password) {
		$try_login = "";

		foreach (["REMOTE_USER", "HTTP_REMOTE_USER", "REDIRECT_REMOTE_USER", "PHP_AUTH_USER"] as $hdr) {
			if (!empty($_SERVER[$hdr])) {
				$try_login = $_SERVER[$hdr];
				break;
			}
		}

		if (!$try_login) $try_login = $this->get_login_by_ssl_certificate();

		if ($try_login) {
			$user_id = $this->auto_create_user($try_login, $password);

			if ($user_id) {
				$_SESSION["fake_login"] = $try_login;
				$_SESSION["fake_password"] = "******";
				$_SESSION["hide_hello"] = true;
				$_SESSION["hide_logout"] = true;

				// LemonLDAP can send user informations via HTTP HEADER
				if (Config::get(Config::AUTH_AUTO_CREATE)) {
					// update user name
					$fullname = isset($_SERVER['HTTP_USER_NAME']) ? $_SERVER['HTTP_USER_NAME'] : ($_SERVER['AUTHENTICATE_CN'] ?? "");
					if ($fullname){
						$sth = $this->pdo->prepare("UPDATE ttrss_users SET full_name = ? WHERE id = ?");
						$sth->execute([$fullname, $user_id]);
					}
					// update user mail
					$email = isset($_SERVER['HTTP_USER_MAIL']) ? $_SERVER['HTTP_USER_MAIL'] : ($_SERVER['AUTHENTICATE_MAIL'] ?? "");
					if ($email){
						$sth = $this->pdo->prepare("UPDATE ttrss_users SET email = ? WHERE id = ?");
						$sth->execute([$email, $user_id]);
					}
				}

				return $user_id;
			}
		}

		return false;
	}

	function api_version() {
		return 2;
	}

}
