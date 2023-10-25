<?php
class Db_Prefs {
	// this class is a stub for the time being (to be removed)

	/**
	 * @return bool|int|null|string
	 */
	function read(string $pref_name, ?int $user_id = null, bool $die_on_error = false) {
		return get_pref($pref_name, $user_id);
	}

	/**
	 * @param mixed $value
	 */
	function write(string $pref_name, $value, ?int $user_id = null, bool $strip_tags = true): bool {
		return set_pref($pref_name, $value, $user_id, $strip_tags);
	}
}
