<?php
class Db_Prefs {
	// this class is a stub for the time being (to be removed)

	/**
	 * @return bool|int|null|string
	 */
	function read(string $pref_name, ?int $user_id = null, bool $die_on_error = false) {
		return Prefs::get($pref_name, $user_id ?: $_SESSION['uid'], $_SESSION['profile'] ?? null);
	}

	/**
	 * @param mixed $value
	 */
	function write(string $pref_name, $value, ?int $user_id = null, bool $strip_tags = true): bool {
		return Prefs::set($pref_name, $value, $user_id ?: $_SESSION['uid'], $_SESSION['profile'] ?? null, $strip_tags);
	}
}
