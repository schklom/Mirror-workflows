<?php
class Cache_Local implements Cache_Adapter {
	private string $dir;

	public function remove(string $filename): bool {
		return unlink($this->get_full_path($filename));
	}

	public function get_mtime(string $filename) {
		return filemtime($this->get_full_path($filename));
	}

	public function set_dir(string $dir) : void {
		$cache_dir = Config::get(Config::CACHE_DIR);

		// use absolute path local to current dir if CACHE_DIR is relative
		// TODO: maybe add a special method to Config() for this?
		if ($cache_dir[0] != '/')
			$cache_dir = dirname(__DIR__) . "/$cache_dir";

		$this->dir = $cache_dir . "/" . basename(clean($dir));

		$this->make_dir();
	}

	public function get_dir(): string {
		return $this->dir;
	}

	public function make_dir(): bool {
		if (!is_dir($this->dir)) {
			return mkdir($this->dir);
		}
		return false;
	}

	public function is_writable(?string $filename = null): bool {
		if ($filename) {
			if (file_exists($this->get_full_path($filename)))
				return is_writable($this->get_full_path($filename));
			else
				return is_writable($this->dir);
		} else {
			return is_writable($this->dir);
		}
	}

	public function exists(string $filename): bool {
		return file_exists($this->get_full_path($filename));
	}

	/**
	 * @return int|false -1 if the file doesn't exist, false if an error occurred, size in bytes otherwise
	 */
	public function get_size(string $filename) {
		if ($this->exists($filename))
			return filesize($this->get_full_path($filename));
		else
			return -1;
	}

	public function get_full_path(string $filename): string {
		return $this->dir . "/" . basename(clean($filename));
	}

	public function get(string $filename): ?string {
		if ($this->exists($filename))
			return file_get_contents($this->get_full_path($filename));
		else
			return null;
	}

	/**
	 * @param mixed $data
	 *
	 * @return int|false Bytes written or false if an error occurred.
	 */
	public function put(string $filename, $data) {
		return file_put_contents($this->get_full_path($filename), $data);
	}

	/**
	 * @return false|null|string false if detection failed, null if the file doesn't exist, string mime content type otherwise
	 */
	public function get_mime_type(string $filename) {
		if ($this->exists($filename))
			return mime_content_type($this->get_full_path($filename));
		else
			return null;
	}

	/**
	 * @return bool|int false if the file doesn't exist (or unreadable) or isn't audio/video, true if a plugin handled, otherwise int of bytes sent
	 */
	public function send(string $filename) {
		return $this->send_local_file($this->get_full_path($filename));
	}

	public function expire_all(): void {
		$dirs = array_filter(glob(Config::get(Config::CACHE_DIR) . '/*'), is_dir(...));

		foreach ($dirs as $cache_dir) {
			$num_deleted = 0;

			if (is_writable($cache_dir) && !file_exists("$cache_dir/.no-auto-expiry")) {
				$files = glob("$cache_dir/*");

				if ($files) {
					foreach ($files as $file) {
						if (time() - filemtime($file) > 86400 * Config::get(Config::CACHE_MAX_DAYS)) {
							unlink($file);

							++$num_deleted;
						}
					}
				}

				Debug::log("Expired $cache_dir: removed $num_deleted files.");
			}
		}
	}

	/**
	 * this is essentially a wrapper for readfile() which allows plugins to hook
	 * output with httpd-specific "fast" implementation i.e. X-Sendfile or whatever else
	 *
	 * hook function should return true if request was handled (or at least attempted to)
	 *
	 * note that this can be called without user context so the plugin to handle this
	 * should be loaded systemwide in config.php
	 *
	 * @param string $filename The full path of the file to send.
	 * @return bool|int false if the file doesn't exist (or unreadable) or isn't audio/video, true if a plugin handled, otherwise int of bytes sent
	 */
	private function send_local_file(string $filename) {
		if (file_exists($filename)) {

			if (is_writable($filename) && !$this->exists('.no-auto-expiry')) {
				touch($filename);
			}

			$tmppluginhost = new PluginHost();

			$tmppluginhost->load(Config::get(Config::PLUGINS), PluginHost::KIND_SYSTEM);
			//$tmppluginhost->load_data();

			if ($tmppluginhost->run_hooks_until(PluginHost::HOOK_SEND_LOCAL_FILE, true, $filename))
				return true;

			return readfile($filename);
		} else {
			return false;
		}
	}

}
