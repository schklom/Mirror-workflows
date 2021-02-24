<?php
class Db_Prefs {
	private $pdo;
	private static $instance;
	private $cache;

	function __construct() {
		$this->pdo = Db::pdo();
		$this->cache = [];
		$this->cache_prefs();
	}

	private function __clone() {
		//
	}

	public static function get() {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

	private function cache_prefs() {
		if (!empty($_SESSION["uid"])) {
			$profile = $_SESSION["profile"] ?? false;

			if (!is_numeric($profile) || !$profile || get_schema_version() < 63) $profile = null;

			$sth = $this->pdo->prepare("SELECT up.pref_name, pt.type_name, up.value
				 FROM	ttrss_user_prefs up
					JOIN ttrss_prefs p ON (up.pref_name = p.pref_name)
					JOIN ttrss_prefs_types pt ON (p.type_id = pt.id)
				WHERE
					up.pref_name NOT LIKE '_MOBILE%' AND
					(profile = :profile OR (:profile IS NULL AND profile IS NULL)) AND
					owner_uid = :uid");

			$sth->execute([":profile" => $profile, ":uid" => $_SESSION["uid"]]);

			while ($row = $sth->fetch(PDO::FETCH_ASSOC)) {
				$pref_name = $row["pref_name"];

				$this->cache[$pref_name] = [
					"type" => $row["type_name"],
					"value" => $row["value"]
				];
			}
		}
	}

	function read($pref_name, $user_id = false, $die_on_error = false) {

		if (!$user_id) {
			$user_id = $_SESSION["uid"];
			$profile = $_SESSION["profile"] ?? false;
		} else {
			$profile = false;
		}

		if ($user_id == ($_SESSION['uid'] ?? false) && isset($this->cache[$pref_name])) {
			$tuple = $this->cache[$pref_name];
			return $this->convert($tuple["value"], $tuple["type"]);
		}

		if (!is_numeric($profile) || !$profile || get_schema_version() < 63) $profile = null;

		$sth = $this->pdo->prepare("SELECT up.pref_name, pt.type_name, up.value
			FROM ttrss_user_prefs up
				JOIN ttrss_prefs p ON (up.pref_name = p.pref_name)
				JOIN ttrss_prefs_types pt ON (p.type_id = pt.id)
			WHERE
				up.pref_name = :pref_name AND
				(profile = :profile OR (:profile IS NULL AND profile IS NULL)) AND
				owner_uid = :uid");

		$sth->execute([":uid" => $user_id, ":profile" => $profile, ":pref_name" => $pref_name]);

		if ($row = $sth->fetch(PDO::FETCH_ASSOC)) {
			$value = $row["value"];
			$type_name = $row["type_name"];

			if ($user_id == ($_SESSION["uid"] ?? false)) {
				$this->cache[$pref_name] = [
					"type" => $row["type_name"],
					"value" => $row["value"]
				];
			}

			return $this->convert($value, $type_name);

		} else if ($die_on_error) {
			user_error("Failed retrieving preference $pref_name for user $user_id", E_USER_ERROR);
		} else {
			user_error("Failed retrieving preference $pref_name for user $user_id", E_USER_WARNING);
		}

		return null;
	}

	function convert($value, $type_name) {
		if ($type_name == "bool") {
			return $value == "true";
		} else if ($type_name == "integer") {
			return (int)$value;
		} else {
			return $value;
		}
	}

	function write($pref_name, $value, $user_id = false, $strip_tags = true) {
		if ($strip_tags) $value = strip_tags($value);

		if (!$user_id) {
			$user_id = $_SESSION["uid"];
			@$profile = $_SESSION["profile"] ?? false;
		} else {
			$profile = null;
		}

		if (!is_numeric($profile) || !$profile || get_schema_version() < 63) $profile = null;

		$type_name = "";
		$current_value = "";

		if (isset($this->cache[$pref_name])) {
			$type_name = $this->cache[$pref_name]["type"];
			$current_value = $this->cache[$pref_name]["value"];
		}

		if (!$type_name) {
			$sth = $this->pdo->prepare("SELECT type_name
				FROM ttrss_prefs,ttrss_prefs_types
				WHERE pref_name = ? AND type_id = ttrss_prefs_types.id");
			$sth->execute([$pref_name]);

			if ($row = $sth->fetch())
				$type_name = $row["type_name"];

		} else if ($current_value == $value) {
			return;
		}

		if ($type_name) {
			if ($type_name == "bool") {
				if ($value == "1" || $value == "true") {
					$value = "true";
				} else {
					$value = "false";
				}
			} else if ($type_name == "integer") {
				$value = (int)$value;
			}

			if ($pref_name == 'USER_TIMEZONE' && $value == '') {
				$value = 'UTC';
			}

			$sth = $this->pdo->prepare("UPDATE ttrss_user_prefs SET
				value = :value WHERE pref_name = :pref_name
					AND (profile = :profile OR (:profile IS NULL AND profile IS NULL))
					AND owner_uid = :uid");

			$sth->execute([":pref_name" => $pref_name, ":value" => $value, ":uid" => $user_id, ":profile" => $profile]);

			if ($user_id == $_SESSION["uid"]) {
				$this->cache[$pref_name]["type"] = $type_name;
				$this->cache[$pref_name]["value"] = $value;
			}
		}
	}

}
