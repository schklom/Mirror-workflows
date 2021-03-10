<?php
class Prefs {
	// (this is the database-backed version of Config.php)

	const PURGE_OLD_DAYS = "PURGE_OLD_DAYS";
	const DEFAULT_UPDATE_INTERVAL = "DEFAULT_UPDATE_INTERVAL";
	//const DEFAULT_ARTICLE_LIMIT = "DEFAULT_ARTICLE_LIMIT";
	//const ALLOW_DUPLICATE_POSTS = "ALLOW_DUPLICATE_POSTS";
	const ENABLE_FEED_CATS = "ENABLE_FEED_CATS";
	const SHOW_CONTENT_PREVIEW = "SHOW_CONTENT_PREVIEW";
	const SHORT_DATE_FORMAT = "SHORT_DATE_FORMAT";
	const LONG_DATE_FORMAT = "LONG_DATE_FORMAT";
	const COMBINED_DISPLAY_MODE = "COMBINED_DISPLAY_MODE";
	const HIDE_READ_FEEDS = "HIDE_READ_FEEDS";
	const ON_CATCHUP_SHOW_NEXT_FEED = "ON_CATCHUP_SHOW_NEXT_FEED";
	const FEEDS_SORT_BY_UNREAD = "FEEDS_SORT_BY_UNREAD";
	const REVERSE_HEADLINES = "REVERSE_HEADLINES";
	const DIGEST_ENABLE = "DIGEST_ENABLE";
	const CONFIRM_FEED_CATCHUP = "CONFIRM_FEED_CATCHUP";
	const CDM_AUTO_CATCHUP = "CDM_AUTO_CATCHUP";
	const _DEFAULT_VIEW_MODE = "_DEFAULT_VIEW_MODE";
	const _DEFAULT_VIEW_LIMIT = "_DEFAULT_VIEW_LIMIT";
	//const _PREFS_ACTIVE_TAB = "_PREFS_ACTIVE_TAB";
	//const STRIP_UNSAFE_TAGS = "STRIP_UNSAFE_TAGS";
	const BLACKLISTED_TAGS = "BLACKLISTED_TAGS";
	const FRESH_ARTICLE_MAX_AGE = "FRESH_ARTICLE_MAX_AGE";
	const DIGEST_CATCHUP = "DIGEST_CATCHUP";
	const CDM_EXPANDED = "CDM_EXPANDED";
	const PURGE_UNREAD_ARTICLES = "PURGE_UNREAD_ARTICLES";
	const HIDE_READ_SHOWS_SPECIAL = "HIDE_READ_SHOWS_SPECIAL";
	const VFEED_GROUP_BY_FEED = "VFEED_GROUP_BY_FEED";
	const STRIP_IMAGES = "STRIP_IMAGES";
	const _DEFAULT_VIEW_ORDER_BY = "_DEFAULT_VIEW_ORDER_BY";
	const ENABLE_API_ACCESS = "ENABLE_API_ACCESS";
	//const _COLLAPSED_SPECIAL = "_COLLAPSED_SPECIAL";
	//const _COLLAPSED_LABELS = "_COLLAPSED_LABELS";
	//const _COLLAPSED_UNCAT = "_COLLAPSED_UNCAT";
	//const _COLLAPSED_FEEDLIST = "_COLLAPSED_FEEDLIST";
	//const _MOBILE_ENABLE_CATS = "_MOBILE_ENABLE_CATS";
	//const _MOBILE_SHOW_IMAGES = "_MOBILE_SHOW_IMAGES";
	//const _MOBILE_HIDE_READ = "_MOBILE_HIDE_READ";
	//const _MOBILE_SORT_FEEDS_UNREAD = "_MOBILE_SORT_FEEDS_UNREAD";
	//const _MOBILE_BROWSE_CATS = "_MOBILE_BROWSE_CATS";
	//const _THEME_ID = "_THEME_ID";
	const USER_TIMEZONE = "USER_TIMEZONE";
	const USER_STYLESHEET = "USER_STYLESHEET";
	//const SORT_HEADLINES_BY_FEED_DATE = "SORT_HEADLINES_BY_FEED_DATE";
	const SSL_CERT_SERIAL = "SSL_CERT_SERIAL";
	const DIGEST_PREFERRED_TIME = "DIGEST_PREFERRED_TIME";
	//const _PREFS_SHOW_EMPTY_CATS = "_PREFS_SHOW_EMPTY_CATS";
	const _DEFAULT_INCLUDE_CHILDREN = "_DEFAULT_INCLUDE_CHILDREN";
	//const AUTO_ASSIGN_LABELS = "AUTO_ASSIGN_LABELS";
	const _ENABLED_PLUGINS = "_ENABLED_PLUGINS";
	//const _MOBILE_REVERSE_HEADLINES = "_MOBILE_REVERSE_HEADLINES";
	const USER_CSS_THEME = "USER_CSS_THEME";
	const USER_LANGUAGE = "USER_LANGUAGE";
	const DEFAULT_SEARCH_LANGUAGE = "DEFAULT_SEARCH_LANGUAGE";
	const _PREFS_MIGRATED = "_PREFS_MIGRATED";
	const HEADLINES_NO_DISTINCT = "HEADLINES_NO_DISTINCT";
	const DEBUG_HEADLINE_IDS = "DEBUG_HEADLINE_IDS";
	const DISABLE_CONDITIONAL_COUNTERS = "DISABLE_CONDITIONAL_COUNTERS";
	const WIDESCREEN_MODE = "WIDESCREEN_MODE";
	const CDM_ENABLE_GRID = "CDM_ENABLE_GRID";

	private const _DEFAULTS = [
		Prefs::PURGE_OLD_DAYS => [ 60, Config::T_INT ],
		Prefs::DEFAULT_UPDATE_INTERVAL => [ 30, Config::T_INT ],
		//Prefs::DEFAULT_ARTICLE_LIMIT => [ 30, Config::T_INT ],
		//Prefs::ALLOW_DUPLICATE_POSTS => [ false, Config::T_BOOL ],
		Prefs::ENABLE_FEED_CATS => [ true, Config::T_BOOL ],
		Prefs::SHOW_CONTENT_PREVIEW => [ true, Config::T_BOOL ],
		Prefs::SHORT_DATE_FORMAT => [ "M d, G:i", Config::T_STRING ],
		Prefs::LONG_DATE_FORMAT => [ "D, M d Y - G:i", Config::T_STRING ],
		Prefs::COMBINED_DISPLAY_MODE => [ true, Config::T_BOOL ],
		Prefs::HIDE_READ_FEEDS => [ false, Config::T_BOOL ],
		Prefs::ON_CATCHUP_SHOW_NEXT_FEED => [ false, Config::T_BOOL ],
		Prefs::FEEDS_SORT_BY_UNREAD => [ false, Config::T_BOOL ],
		Prefs::REVERSE_HEADLINES => [ false, Config::T_BOOL ],
		Prefs::DIGEST_ENABLE => [ false, Config::T_BOOL ],
		Prefs::CONFIRM_FEED_CATCHUP => [ true, Config::T_BOOL ],
		Prefs::CDM_AUTO_CATCHUP => [ false, Config::T_BOOL ],
		Prefs::_DEFAULT_VIEW_MODE => [ "adaptive", Config::T_STRING ],
		Prefs::_DEFAULT_VIEW_LIMIT => [ 30, Config::T_INT ],
		//Prefs::_PREFS_ACTIVE_TAB => [ "", Config::T_STRING ],
		//Prefs::STRIP_UNSAFE_TAGS => [ true, Config::T_BOOL ],
		Prefs::BLACKLISTED_TAGS => [ 'main, generic, misc, uncategorized, blog, blogroll, general, news', Config::T_STRING ],
		Prefs::FRESH_ARTICLE_MAX_AGE => [ 24, Config::T_INT ],
		Prefs::DIGEST_CATCHUP => [ false, Config::T_BOOL ],
		Prefs::CDM_EXPANDED => [ true, Config::T_BOOL ],
		Prefs::PURGE_UNREAD_ARTICLES => [ true, Config::T_BOOL ],
		Prefs::HIDE_READ_SHOWS_SPECIAL => [ true, Config::T_BOOL ],
		Prefs::VFEED_GROUP_BY_FEED => [ false, Config::T_BOOL ],
		Prefs::STRIP_IMAGES => [ false, Config::T_BOOL ],
		Prefs::_DEFAULT_VIEW_ORDER_BY => [ "default", Config::T_STRING ],
		Prefs::ENABLE_API_ACCESS => [ false, Config::T_BOOL ],
		//Prefs::_COLLAPSED_SPECIAL => [ false, Config::T_BOOL ],
		//Prefs::_COLLAPSED_LABELS => [ false, Config::T_BOOL ],
		//Prefs::_COLLAPSED_UNCAT => [ false, Config::T_BOOL ],
		//Prefs::_COLLAPSED_FEEDLIST => [ false, Config::T_BOOL ],
		//Prefs::_MOBILE_ENABLE_CATS => [ false, Config::T_BOOL ],
		//Prefs::_MOBILE_SHOW_IMAGES => [ false, Config::T_BOOL ],
		//Prefs::_MOBILE_HIDE_READ => [ false, Config::T_BOOL ],
		//Prefs::_MOBILE_SORT_FEEDS_UNREAD => [ false, Config::T_BOOL ],
		//Prefs::_MOBILE_BROWSE_CATS => [ true, Config::T_BOOL ],
		//Prefs::_THEME_ID => [ 0, Config::T_BOOL ],
		Prefs::USER_TIMEZONE => [ "Automatic", Config::T_STRING ],
		Prefs::USER_STYLESHEET => [ "", Config::T_STRING ],
		//Prefs::SORT_HEADLINES_BY_FEED_DATE => [ false, Config::T_BOOL ],
		Prefs::SSL_CERT_SERIAL => [ "", Config::T_STRING ],
		Prefs::DIGEST_PREFERRED_TIME => [ "00:00", Config::T_STRING ],
		//Prefs::_PREFS_SHOW_EMPTY_CATS => [ false, Config::T_BOOL ],
		Prefs::_DEFAULT_INCLUDE_CHILDREN => [ false, Config::T_BOOL ],
		//Prefs::AUTO_ASSIGN_LABELS => [ false, Config::T_BOOL ],
		Prefs::_ENABLED_PLUGINS => [ "", Config::T_STRING ],
		//Prefs::_MOBILE_REVERSE_HEADLINES => [ false, Config::T_BOOL ],
		Prefs::USER_CSS_THEME => [ "" , Config::T_STRING ],
		Prefs::USER_LANGUAGE => [ "" , Config::T_STRING ],
		Prefs::DEFAULT_SEARCH_LANGUAGE => [ "" , Config::T_STRING ],
		Prefs::_PREFS_MIGRATED => [ false, Config::T_BOOL ],
		Prefs::HEADLINES_NO_DISTINCT => [ false, Config::T_BOOL ],
		Prefs::DEBUG_HEADLINE_IDS => [ false, Config::T_BOOL ],
		Prefs::DISABLE_CONDITIONAL_COUNTERS => [ false, Config::T_BOOL ],
		Prefs::WIDESCREEN_MODE => [ false, Config::T_BOOL ],
		Prefs::CDM_ENABLE_GRID => [ false, Config::T_BOOL ],
	];

	const _PROFILE_BLACKLIST = [
		//Prefs::ALLOW_DUPLICATE_POSTS,
		Prefs::PURGE_OLD_DAYS,
		Prefs::PURGE_UNREAD_ARTICLES,
		Prefs::DIGEST_ENABLE,
		Prefs::DIGEST_CATCHUP,
		Prefs::BLACKLISTED_TAGS,
		Prefs::ENABLE_API_ACCESS,
		//Prefs::UPDATE_POST_ON_CHECKSUM_CHANGE,
		Prefs::DEFAULT_UPDATE_INTERVAL,
		Prefs::USER_TIMEZONE,
		//Prefs::SORT_HEADLINES_BY_FEED_DATE,
		Prefs::SSL_CERT_SERIAL,
		Prefs::DIGEST_PREFERRED_TIME,
		Prefs::_PREFS_MIGRATED
	];

	private static $instance;
	private $cache = [];

	/** @var PDO */
	private $pdo;

	public static function get_instance() : Prefs {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

	static function is_valid(string $pref_name) {
		return isset(self::_DEFAULTS[$pref_name]);
	}

	static function get_default(string $pref_name) {
		if (self::is_valid($pref_name))
			return self::_DEFAULTS[$pref_name][0];
		else
			return null;
	}

	function __construct() {
		$this->pdo = Db::pdo();

		if (!empty($_SESSION["uid"])) {
			$owner_uid = (int) $_SESSION["uid"];
			$profile_id = $_SESSION["profile"] ?? null;

			$this->cache_all($owner_uid, $profile_id);
			$this->migrate($owner_uid, $profile_id);
		};
	}

	private function __clone() {
		//
	}

	static function get_all(int $owner_uid, int $profile_id = null) {
		return self::get_instance()->_get_all($owner_uid, $profile_id);
	}

	private function _get_all(int $owner_uid, int $profile_id = null) {
		$rv = [];

		$ref = new ReflectionClass(get_class($this));

		foreach ($ref->getConstants() as $const => $cvalue) {
			if (isset($this::_DEFAULTS[$const])) {
				list ($def_val, $type_hint) = $this::_DEFAULTS[$const];

				array_push($rv, [
					"pref_name" => $const,
					"value" => $this->_get($const, $owner_uid, $profile_id),
					"type_hint" => $type_hint,
				]);
			}
		}

		return $rv;
	}

	private function cache_all(int $owner_uid, $profile_id = null) {
		if (!$profile_id) $profile_id = null;

		// fill cache with defaults
		$ref = new ReflectionClass(get_class($this));
		foreach ($ref->getConstants() as $const => $cvalue) {
			if (isset($this::_DEFAULTS[$const])) {
				list ($def_val, $type_hint) = $this::_DEFAULTS[$const];

				$this->_set_cache($const, $def_val, $owner_uid, $profile_id);
			}
		}

		if (get_schema_version() >= 141) {
			// fill in any overrides from the database
			$sth = $this->pdo->prepare("SELECT pref_name, value FROM ttrss_user_prefs2
									WHERE owner_uid = :uid AND
										(profile = :profile OR (:profile IS NULL AND profile IS NULL))");

			$sth->execute(["uid" => $owner_uid, "profile" => $profile_id]);

			while ($row = $sth->fetch()) {
				$this->_set_cache($row["pref_name"], $row["value"], $owner_uid, $profile_id);
			}
		}
	}

	static function get(string $pref_name, int $owner_uid, int $profile_id = null) {
		return self::get_instance()->_get($pref_name, $owner_uid, $profile_id);
	}

	private function _get(string $pref_name, int $owner_uid, int $profile_id = null) {
		if (isset(self::_DEFAULTS[$pref_name])) {
			if (!$profile_id || in_array($pref_name, self::_PROFILE_BLACKLIST)) $profile_id = null;

			list ($def_val, $type_hint) = self::_DEFAULTS[$pref_name];

			$cached_value = $this->_get_cache($pref_name, $owner_uid, $profile_id);

			if ($this->_is_cached($pref_name, $owner_uid, $profile_id)) {
				$cached_value = $this->_get_cache($pref_name, $owner_uid, $profile_id);
				return Config::cast_to($cached_value, $type_hint);
			} else if (get_schema_version() >= 141) {
				$sth = $this->pdo->prepare("SELECT value FROM ttrss_user_prefs2
								WHERE pref_name = :name AND owner_uid = :uid AND
								(profile = :profile OR (:profile IS NULL AND profile IS NULL))");

				$sth->execute(["uid" => $owner_uid, "profile" => $profile_id, "name" => $pref_name ]);

				if ($row = $sth->fetch(PDO::FETCH_ASSOC)) {
					$this->_set_cache($pref_name, $row["value"], $owner_uid, $profile_id);

					return Config::cast_to($row["value"], $type_hint);
				} else {
					$this->_set_cache($pref_name, $def_val, $owner_uid, $profile_id);

					return $def_val;
				}
			} else {
				return Config::cast_to($def_val, $type_hint);

			}
		} else {
			user_error("Attempt to get invalid preference key: $pref_name (UID: $owner_uid, profile: $profile_id)", E_USER_WARNING);
		}

		return null;
	}

	private function _is_cached(string $pref_name, int $owner_uid, int $profile_id = null) {
		$cache_key = sprintf("%d/%d/%s", $owner_uid, $profile_id, $pref_name);
		return isset($this->cache[$cache_key]);
	}

	private function _get_cache(string $pref_name, int $owner_uid, int $profile_id = null) {
		$cache_key = sprintf("%d/%d/%s", $owner_uid, $profile_id, $pref_name);

		if (isset($this->cache[$cache_key]))
			return $this->cache[$cache_key];

		return null;
	}

	private function _set_cache(string $pref_name, $value, int $owner_uid, int $profile_id = null) {
		$cache_key = sprintf("%d/%d/%s", $owner_uid, $profile_id, $pref_name);

		$this->cache[$cache_key] = $value;
	}

	static function set(string $pref_name, $value, int $owner_uid, int $profile_id = null, bool $strip_tags = true) {
		return self::get_instance()->_set($pref_name, $value, $owner_uid, $profile_id);
	}

	private function _delete(string $pref_name, int $owner_uid, int $profile_id = null) {
		$sth = $this->pdo->prepare("DELETE FROM ttrss_user_prefs2
			WHERE pref_name = :name AND owner_uid = :uid AND
				(profile = :profile OR (:profile IS NULL AND profile IS NULL))");

		return $sth->execute(["uid" => $owner_uid, "profile" => $profile_id, "name" => $pref_name ]);
	}

	private function _set(string $pref_name, $value, int $owner_uid, int $profile_id = null, bool $strip_tags = true) {
		if (!$profile_id) $profile_id = null;

		if ($profile_id && in_array($pref_name, self::_PROFILE_BLACKLIST))
			return false;

		if (isset(self::_DEFAULTS[$pref_name])) {
			list ($def_val, $type_hint) = self::_DEFAULTS[$pref_name];

			if ($strip_tags)
				$value = trim(strip_tags($value));

			$value = Config::cast_to($value, $type_hint);

			// is this a good idea or not? probably not (user-set value remains user-set even if its at default)
			//if ($value == $def_val)
			//	return $this->_delete($pref_name, $owner_uid, $profile_id);

			if ($value == $this->_get($pref_name, $owner_uid, $profile_id))
				return false;

			$this->_set_cache($pref_name, $value, $owner_uid, $profile_id);

			$sth = $this->pdo->prepare("SELECT COUNT(pref_name) AS count FROM ttrss_user_prefs2
				WHERE pref_name = :name AND owner_uid = :uid AND
				(profile = :profile OR (:profile IS NULL AND profile IS NULL))");
			$sth->execute(["uid" => $owner_uid, "profile" => $profile_id, "name" => $pref_name ]);

			if ($row = $sth->fetch()) {
				if ($row["count"] == 0) {
					$sth = $this->pdo->prepare("INSERT INTO ttrss_user_prefs2
						(pref_name, value, owner_uid, profile)
						VALUES
						(:name, :value, :uid, :profile)");

					return $sth->execute(["uid" => $owner_uid, "profile" => $profile_id, "name" => $pref_name, "value" => $value ]);

				} else {
					$sth = $this->pdo->prepare("UPDATE ttrss_user_prefs2
						SET value = :value
						WHERE pref_name = :name AND owner_uid = :uid AND
							(profile = :profile OR (:profile IS NULL AND profile IS NULL))");

					return $sth->execute(["uid" => $owner_uid, "profile" => $profile_id, "name" => $pref_name, "value" => $value ]);
				}
			}
		} else {
			user_error("Attempt to set invalid preference key: $pref_name (UID: $owner_uid, profile: $profile_id)", E_USER_WARNING);
		}

		return false;
	}

	function migrate(int $owner_uid, int $profile_id = null) {
		if (get_schema_version() < 141)
			return;

		if (!$profile_id) $profile_id = null;

		if (!$this->_get(Prefs::_PREFS_MIGRATED, $owner_uid, $profile_id)) {

			$in_nested_tr = false;

			try {
				$this->pdo->beginTransaction();
			} catch (PDOException $e) {
				$in_nested_tr = true;
			}

			$sth = $this->pdo->prepare("SELECT pref_name, value FROM ttrss_user_prefs
				WHERE owner_uid = :uid AND
					(profile = :profile OR (:profile IS NULL AND profile IS NULL))");
			$sth->execute(["uid" => $owner_uid, "profile" => $profile_id]);

			while ($row = $sth->fetch(PDO::FETCH_ASSOC)) {
				if (isset(self::_DEFAULTS[$row["pref_name"]])) {
					list ($def_val, $type_hint) = self::_DEFAULTS[$row["pref_name"]];

					$user_val = Config::cast_to($row["value"], $type_hint);

					if ($user_val != $def_val) {
						$this->_set($row["pref_name"], $user_val, $owner_uid, $profile_id);
					}
				}
			}

			$this->_set(Prefs::_PREFS_MIGRATED, "1", $owner_uid, $profile_id);

			if (!$in_nested_tr)
				$this->pdo->commit();

			Logger::log(E_USER_NOTICE, sprintf("Migrated preferences of user %d (profile %d)", $owner_uid, $profile_id));
		}
	}

	static function reset(int $owner_uid, int $profile_id = null) {
		if (!$profile_id) $profile_id = null;

		$sth = Db::pdo()->prepare("DELETE FROM ttrss_user_prefs2
								WHERE owner_uid = :uid AND pref_name != :mig_key AND
								(profile = :profile OR (:profile IS NULL AND profile IS NULL))");

		$sth->execute(["uid" => $owner_uid, "mig_key" => self::_PREFS_MIGRATED, "profile" => $profile_id]);
	}
}
