<?php
class Db_Prefs {
	// this class is a stub for the time being (to be removed)

	function read($pref_name, $user_id = false, $die_on_error = false) {
		return get_pref($pref_name, $user_id);
	}

	function write($pref_name, $value, $user_id = false, $strip_tags = true) {
		return set_pref($pref_name, $value, $user_id, $strip_tags);
	}
}
