<?php
interface Cache_Adapter {
	public function set_dir(string $dir) : void;
	public function get_dir(): string;
	public function make_dir(): bool;
	public function is_writable(?string $filename = null): bool;
	public function exists(string $filename): bool;
	/**
	 * @return int|false -1 if the file doesn't exist, false if an error occurred, size in bytes otherwise
	 */
	public function get_size(string $filename);
	/**
	 * @return int|false -1 if the file doesn't exist, false if an error occurred, timestamp otherwise
	 */
	public function get_mtime(string $filename);
	/**
	 * @param mixed $data
	 *
	 * @return int|false Bytes written or false if an error occurred.
	 */
	public function put(string $filename, $data);
	public function get(string $filename): ?string;
	public function get_full_path(string $filename): string;
	public function remove(string $filename) : bool;
	/**
	 * @return false|null|string false if detection failed, null if the file doesn't exist, string mime content type otherwise
	 */
	public function get_mime_type(string $filename);
	/**
	 * @return bool|int false if the file doesn't exist (or unreadable) or isn't audio/video, true if a plugin handled, otherwise int of bytes sent
	 */
	public function send(string $filename);

	/** Catchall function to expire all subfolders/prefixes in the cache, invoked on the backend */
	public function expire_all(): void;
}
