<?php
require_once 'lib/gettext/gettext.inc.php';

/**
 * @todo look into making this behave closer to what SessionHandlerInterface intends
 */
class Sessions implements \SessionHandlerInterface {
	private int $session_expire;
	private string $session_name;

	private const SODIUM_ALGO = 'xchacha20poly1305_ietf';

	public function __construct() {
		$this->session_expire = min(2147483647 - time() - 1, Config::get(Config::SESSION_COOKIE_LIFETIME));
		$this->session_name = Config::get(Config::SESSION_NAME);
	}

	/**
	 * Adjusts session-related PHP configuration options
	 */
	public function configure(): void {
		if (Config::is_server_https()) {
			ini_set('session.cookie_secure', 'true');
		}

		ini_set('session.gc_probability', '75');
		ini_set('session.name', $this->session_name);
		ini_set('session.use_only_cookies', 'true');
		ini_set('session.gc_maxlifetime', $this->session_expire);
		ini_set('session.cookie_lifetime', '0');
	}

	/**
	 * Extend the validity of the PHP session cookie (if it exists) and is persistent (expire > 0)
	 * @return bool Whether the new cookie was set successfully
	 */
	public function extend_session(): bool {
		if (isset($_COOKIE[$this->session_name]) && $this->session_expire > 0) {
			return setcookie($this->session_name,
				$_COOKIE[$this->session_name],
				time() + $this->session_expire,
				ini_get('session.cookie_path'),
				ini_get('session.cookie_domain'),
				ini_get('session.cookie_secure'),
				ini_get('session.cookie_httponly'));
		}
		return false;
	}

	public function open(string $path, string $name): bool {
		return true;
	}

	public function close(): bool {
		return true;
	}

	/** encrypts provided ciphertext using Sodium symmetric encryption key if available via Config::SESSION_ENCRYPTION_KEY
	 *
	 * @return array<string,mixed> encrypted data object containing algo, nonce, and encrypted data
	 *
	*/
	private function encrypt_string(string $ciphertext) : array {
		$key = Config::get(Config::SESSION_ENCRYPTION_KEY);
		$nonce = \random_bytes(\SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);

		$payload = sodium_crypto_aead_xchacha20poly1305_ietf_encrypt($ciphertext, '', $nonce, hex2bin($key));

		if ($payload) {
			$encrypted_data = [
				'algo' => self::SODIUM_ALGO,
				'nonce' => $nonce,
				'payload' => $payload,
			];

			return $encrypted_data;
		}

		throw new Exception("Config::encrypt_string() failed to encrypt ciphertext");
	}

	/** decrypts payload of encrypted object if Config::SESSION_ENCRYPTION_KEY is available and object is in correct format
	 *
	 * @param array<string,mixed> $encrypted_data
	 *
	 * @return string decrypted string payload
	 */
	private function decrypt_string(array $encrypted_data) : string {
		$key = Config::get(Config::SESSION_ENCRYPTION_KEY);

		if ($encrypted_data['algo'] === self::SODIUM_ALGO) {
			$payload = sodium_crypto_aead_xchacha20poly1305_ietf_decrypt($encrypted_data['payload'], '', $encrypted_data['nonce'], hex2bin($key));

			return $payload;
		}

		throw new Exception('Config::decrypt_string() failed to decrypt passed encrypted data');
	}

	public function read(string $id): false|string {
		$sth = Db::pdo()->prepare('SELECT data FROM ttrss_sessions WHERE id=?');
		$sth->execute([$id]);

		if ($row = $sth->fetch()) {
			$data = base64_decode($row['data']);

			if (Config::get(Config::SESSION_ENCRYPTION_KEY)) {
				$unserialized_data = @unserialize($data); // avoid leaking plaintext session via error message

				if ($unserialized_data !== false)
					return $this->decrypt_string($unserialized_data);
			}

			// if Sodium key is missing or session data is not in serialized format, return as-is
			return $data;
		}

		$expire = time() + $this->session_expire;

		$sth = Db::pdo()->prepare("INSERT INTO ttrss_sessions (id, data, expire)
			VALUES (?, '', ?)");
		return $sth->execute([$id, $expire]) ? '' : false;
	}

	public function write(string $id, string $data): bool {

		if (Config::get(Config::SESSION_ENCRYPTION_KEY))
			$data = serialize($this->encrypt_string($data));

		$data = base64_encode($data);

		$expire = time() + $this->session_expire;

		$sth = Db::pdo()->prepare('SELECT id FROM ttrss_sessions WHERE id=?');
		$sth->execute([$id]);

		if ($sth->fetch()) {
			$sth = Db::pdo()->prepare('UPDATE ttrss_sessions SET data=?, expire=? WHERE id=?');
			return $sth->execute([$data, $expire, $id]);
		}

		$sth = Db::pdo()->prepare('INSERT INTO ttrss_sessions (id, data, expire) VALUES (?, ?, ?)');
		return $sth->execute([$id, $data, $expire]);
	}

	public function destroy(string $id): bool {
		$sth = Db::pdo()->prepare('DELETE FROM ttrss_sessions WHERE id = ?');
		return $sth->execute([$id]);
	}

	/**
	 * @return int|false the number of deleted sessions on success, or false on failure
	 */
	public function gc(int $max_lifetime): false|int {
		$result = Db::pdo()->query('DELETE FROM ttrss_sessions WHERE expire < ' . time());
		return $result === false ? false : $result->rowCount();
	}

	public static function validate_session(): bool {
		if (Config::get(Config::SINGLE_USER_MODE)) return true;

		$pdo = Db::pdo();

		if (!empty($_SESSION['uid'])) {
			$user = ORM::for_table('ttrss_users')->find_one($_SESSION['uid']);

			if ($user) {
				if ($user->pwd_hash != $_SESSION['pwd_hash']) {
					$_SESSION['login_error_msg'] = __('Session failed to validate (password changed)');
					return false;
				}

				if ($user->access_level == UserHelper::ACCESS_LEVEL_DISABLED) {
					$_SESSION['login_error_msg'] = __('Session failed to validate (account is disabled)');
					return false;
				}

				// default to true because there might not be any hooks and this is our last check
				$hook_result = true;

				PluginHost::getInstance()->chain_hooks_callback(PluginHost::HOOK_VALIDATE_SESSION,
					function ($result) use (&$hook_result) {
						$hook_result = $result;

						if (!$result) {
							return true;
						}
					});

				return $hook_result;

			} else {
				$_SESSION['login_error_msg'] = __('Session failed to validate (user not found)');
				return false;
			}
		}

		return true;
	}
}
