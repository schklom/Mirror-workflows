<?php
class Config {
	private const _ENVVAR_PREFIX = "TTRSS_";

	const T_BOOL = 1;
	const T_STRING = 2;
	const T_INT = 3;

	// override defaults, defined below in _DEFAULTS[], via environment: DB_TYPE becomes TTRSS_DB_TYPE, etc

	const DB_TYPE = "DB_TYPE";
	const DB_HOST = "DB_HOST";
	const DB_USER = "DB_USER";
	const DB_NAME = "DB_NAME";
	const DB_PASS = "DB_PASS";
	const DB_PORT = "DB_PORT";
	const MYSQL_CHARSET = "MYSQL_CHARSET";
	const SELF_URL_PATH = "SELF_URL_PATH";
	const SINGLE_USER_MODE = "SINGLE_USER_MODE";
	const SIMPLE_UPDATE_MODE = "SIMPLE_UPDATE_MODE";
	const PHP_EXECUTABLE = "PHP_EXECUTABLE";
	const LOCK_DIRECTORY = "LOCK_DIRECTORY";
	const CACHE_DIR = "CACHE_DIR";
	const ICONS_DIR = "ICONS_DIR";
	const ICONS_URL = "ICONS_URL";
	const AUTH_AUTO_CREATE = "AUTH_AUTO_CREATE";
	const AUTH_AUTO_LOGIN = "AUTH_AUTO_LOGIN";
	const FORCE_ARTICLE_PURGE = "FORCE_ARTICLE_PURGE";
	const SESSION_COOKIE_LIFETIME = "SESSION_COOKIE_LIFETIME";
	const SMTP_FROM_NAME = "SMTP_FROM_NAME";
	const SMTP_FROM_ADDRESS = "SMTP_FROM_ADDRESS";
	const DIGEST_SUBJECT = "DIGEST_SUBJECT";
	const CHECK_FOR_UPDATES = "CHECK_FOR_UPDATES";
	const PLUGINS = "PLUGINS";
	const LOG_DESTINATION = "LOG_DESTINATION";
	const LOCAL_OVERRIDE_STYLESHEET = "LOCAL_OVERRIDE_STYLESHEET";
	const DAEMON_MAX_CHILD_RUNTIME = "DAEMON_MAX_CHILD_RUNTIME";
	const DAEMON_MAX_JOBS = "DAEMON_MAX_JOBS";
	const FEED_FETCH_TIMEOUT = "FEED_FETCH_TIMEOUT";
	const FEED_FETCH_NO_CACHE_TIMEOUT = "FEED_FETCH_NO_CACHE_TIMEOUT";
	const FILE_FETCH_TIMEOUT = "FILE_FETCH_TIMEOUT";
	const FILE_FETCH_CONNECT_TIMEOUT = "FILE_FETCH_CONNECT_TIMEOUT";
	const DAEMON_UPDATE_LOGIN_LIMIT = "DAEMON_UPDATE_LOGIN_LIMIT";
	const DAEMON_FEED_LIMIT = "DAEMON_FEED_LIMIT";
	const DAEMON_SLEEP_INTERVAL = "DAEMON_SLEEP_INTERVAL";
	const MAX_CACHE_FILE_SIZE = "MAX_CACHE_FILE_SIZE";
	const MAX_DOWNLOAD_FILE_SIZE = "MAX_DOWNLOAD_FILE_SIZE";
	const MAX_FAVICON_FILE_SIZE = "MAX_FAVICON_FILE_SIZE";
	const CACHE_MAX_DAYS = "CACHE_MAX_DAYS";
	const MAX_CONDITIONAL_INTERVAL = "MAX_CONDITIONAL_INTERVAL";
	const DAEMON_UNSUCCESSFUL_DAYS_LIMIT = "DAEMON_UNSUCCESSFUL_DAYS_LIMIT";
	const LOG_SENT_MAIL = "LOG_SENT_MAIL";
	const HTTP_PROXY = "HTTP_PROXY";
	const FORBID_PASSWORD_CHANGES = "FORBID_PASSWORD_CHANGES";
	const SESSION_NAME = "SESSION_NAME";

	private const _DEFAULTS = [
		Config::DB_TYPE => [ "pgsql", 									Config::T_STRING ],
		Config::DB_HOST => [ "db", 										Config::T_STRING ],
		Config::DB_USER => [ "",											Config::T_STRING ],
		Config::DB_NAME => [ "", 											Config::T_STRING ],
		Config::DB_PASS => [ "", 											Config::T_STRING ],
		Config::DB_PORT => [ "5432",										Config::T_STRING ],
		Config::MYSQL_CHARSET => [ "UTF8",								Config::T_STRING ],
		Config::SELF_URL_PATH => [ "",									Config::T_STRING ],
		Config::SINGLE_USER_MODE => [ "",								Config::T_BOOL ],
		Config::SIMPLE_UPDATE_MODE => [ "",								Config::T_BOOL ],
		Config::PHP_EXECUTABLE => [ "/usr/bin/php",					Config::T_STRING ],
		Config::LOCK_DIRECTORY => [ "lock",								Config::T_STRING ],
		Config::CACHE_DIR => [ "cache",									Config::T_STRING ],
		Config::ICONS_DIR => [ "feed-icons",							Config::T_STRING ],
		Config::ICONS_URL => [ "feed-icons",							Config::T_STRING ],
		Config::AUTH_AUTO_CREATE => [ "true",							Config::T_BOOL ],
		Config::AUTH_AUTO_LOGIN => [ "true",							Config::T_BOOL ],
		Config::FORCE_ARTICLE_PURGE => [ 0,								Config::T_INT ],
		Config::SESSION_COOKIE_LIFETIME => [ 86400,					Config::T_INT ],
		Config::SMTP_FROM_NAME => [ "Tiny Tiny RSS",					Config::T_STRING ],
		Config::SMTP_FROM_ADDRESS => [ "noreply@localhost",		Config::T_STRING ],
		Config::DIGEST_SUBJECT => [ "[tt-rss] New headlines for last 24 hours",
																					Config::T_STRING ],
		Config::CHECK_FOR_UPDATES => [ "true",							Config::T_BOOL ],
		Config::PLUGINS => [ "auth_internal",							Config::T_STRING ],
		Config::LOG_DESTINATION => [ "sql",								Config::T_STRING ],
		Config::LOCAL_OVERRIDE_STYLESHEET => [ "local-overrides.css",
																					Config::T_STRING ],
		Config::DAEMON_MAX_CHILD_RUNTIME => [ 1800,					Config::T_STRING ],
		Config::DAEMON_MAX_JOBS => [ 2,									Config::T_INT ],
		Config::FEED_FETCH_TIMEOUT => [ 45,								Config::T_INT ],
		Config::FEED_FETCH_NO_CACHE_TIMEOUT => [ 15,					Config::T_INT ],
		Config::FILE_FETCH_TIMEOUT => [ 45,								Config::T_INT ],
		Config::FILE_FETCH_CONNECT_TIMEOUT => [ 15,					Config::T_INT ],
		Config::DAEMON_UPDATE_LOGIN_LIMIT => [ 30,					Config::T_INT ],
		Config::DAEMON_FEED_LIMIT => [ 500,								Config::T_INT ],
		Config::DAEMON_SLEEP_INTERVAL => [ 120,						Config::T_INT ],
		Config::MAX_CACHE_FILE_SIZE => [ 64*1024*1024,				Config::T_INT ],
		Config::MAX_DOWNLOAD_FILE_SIZE => [ 16*1024*1024,			Config::T_INT ],
		Config::MAX_FAVICON_FILE_SIZE => [ 1*1024*1024,				Config::T_INT ],
		Config::CACHE_MAX_DAYS => [ 7,									Config::T_INT ],
		Config::MAX_CONDITIONAL_INTERVAL => [ 3600*12,				Config::T_INT ],
		Config::DAEMON_UNSUCCESSFUL_DAYS_LIMIT => [ 30,				Config::T_INT ],
		Config::LOG_SENT_MAIL => [ "",									Config::T_BOOL ],
		Config::HTTP_PROXY => [ "",										Config::T_STRING ],
		Config::FORBID_PASSWORD_CHANGES => [ "",						Config::T_BOOL ],
		Config::SESSION_NAME => [ "ttrss_sid",							Config::T_STRING ],
	];

	private static $instance;

	private $params = [];

	public static function get_instance() {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

	function __construct() {
		$ref = new ReflectionClass(get_class($this));

		foreach ($ref->getConstants() as $const => $cvalue) {
			if (isset($this::_DEFAULTS[$const])) {
				$override = getenv($this::_ENVVAR_PREFIX . $const);

				list ($defval, $deftype) = $this::_DEFAULTS[$const];

				$this->params[$cvalue] = [ $this->cast_to(!empty($override) ? $override : $defval, $deftype), $deftype ];
			}
		}
	}

	private function cast_to(string $value, int $type_hint) {
		switch ($type_hint) {
			case self::T_BOOL:
				return sql_bool_to_bool($value);
			case self::T_INT:
				return (int) $value;
			default:
				return $value;
		}
	}

	private function _get(string $param) {
		list ($value, $type_hint) = $this->params[$param];

		return $this->cast_to($value, $type_hint);
	}

	private function _add(string $param, string $default, int $type_hint) {
		$override = getenv($this::_ENVVAR_PREFIX . $param);

		$this->params[$param] = [ $this->cast_to(!empty($override) ? $override : $default, $type_hint), $type_hint ];
	}

	static function add(string $param, string $default, int $type_hint = Config::T_STRING) {
		$instance = self::get_instance();

		return $instance->_add($param, $default, $type_hint);
	}

	static function get(string $param) {
		$instance = self::get_instance();

		return $instance->_get($param);
	}

}
