<?php
class Config {
	private const _ENVVAR_PREFIX = "TTRSS_";

	const T_BOOL = 1;
	const T_STRING = 2;
	const T_INT = 3;

	const SCHEMA_VERSION = 145;

	/* override defaults, defined below in _DEFAULTS[], prefixing with _ENVVAR_PREFIX:

		DB_TYPE becomes:

		.env:

		TTRSS_DB_TYPE=pgsql

		or config.php:

		putenv('TTRSS_DB_TYPE=pgsql');

		etc, etc.
	*/

	const DB_TYPE = "DB_TYPE";
	const DB_HOST = "DB_HOST";
	const DB_USER = "DB_USER";
	const DB_NAME = "DB_NAME";
	const DB_PASS = "DB_PASS";
	const DB_PORT = "DB_PORT";
	// database credentials

	const MYSQL_CHARSET = "MYSQL_CHARSET";
	// connection charset for MySQL. if you have a legacy database and/or experience
	// garbage unicode characters with this option, try setting it to a blank string.

	const SELF_URL_PATH = "SELF_URL_PATH";
	// this should be set to a fully qualified URL used to access
	// your tt-rss instance over the net, such as: https://example.com/tt-rss/
	// if your tt-rss instance is behind a reverse proxy, use external URL.
	// tt-rss will likely help you pick correct value for this on startup

	const SINGLE_USER_MODE = "SINGLE_USER_MODE";
	// operate in single user mode, disables all functionality related to
	// multiple users and authentication. enabling this assumes you have
	// your tt-rss directory protected by other means (e.g. http auth).

	const SIMPLE_UPDATE_MODE = "SIMPLE_UPDATE_MODE";
	// enables fallback update mode where tt-rss tries to update feeds in
	// background while tt-rss is open in your browser.
	// if you don't have a lot of feeds and don't want to or can't run
	// background processes while not running tt-rss, this method is generally
	// viable to keep your feeds up to date.

	const PHP_EXECUTABLE = "PHP_EXECUTABLE";
	// use this PHP CLI executable to start various tasks

	const LOCK_DIRECTORY = "LOCK_DIRECTORY";
	// base directory for lockfiles (must be writable)

	const CACHE_DIR = "CACHE_DIR";
	// base directory for local cache (must be writable)

	const ICONS_DIR = "ICONS_DIR";
	const ICONS_URL = "ICONS_URL";
	// directory and URL for feed favicons (directory must be writable)

	const AUTH_AUTO_CREATE = "AUTH_AUTO_CREATE";
	// auto create users authenticated via external modules

	const AUTH_AUTO_LOGIN = "AUTH_AUTO_LOGIN";
	// auto log in users authenticated via external modules i.e. auth_remote

	const FORCE_ARTICLE_PURGE = "FORCE_ARTICLE_PURGE";
	// unconditinally purge all articles older than this amount, in days
	// overrides user-controlled purge interval

	const SESSION_COOKIE_LIFETIME = "SESSION_COOKIE_LIFETIME";
	// default lifetime of a session (e.g. login) cookie. In seconds,
	// 0 means cookie will be deleted when browser closes.

	const SMTP_FROM_NAME = "SMTP_FROM_NAME";
	const SMTP_FROM_ADDRESS = "SMTP_FROM_ADDRESS";
	// send email using this name and address

	const DIGEST_SUBJECT = "DIGEST_SUBJECT";
	// default subject for email digest

	const CHECK_FOR_UPDATES = "CHECK_FOR_UPDATES";
	// enable built-in update checker, both for core code and plugins (using git)

	const PLUGINS = "PLUGINS";
	// system plugins enabled for all users, comma separated list, no quotes
	// keep at least one auth module in there (i.e. auth_internal)

	const LOG_DESTINATION = "LOG_DESTINATION";
	// available options: sql (default, event log), syslog, stdout (for debugging)

	const LOCAL_OVERRIDE_STYLESHEET = "LOCAL_OVERRIDE_STYLESHEET";
	// link this stylesheet on all pages (if it exists), should be placed in themes.local

	const LOCAL_OVERRIDE_JS = "LOCAL_OVERRIDE_JS";
	// same but this javascript file (you can use that for polyfills), should be placed in themes.local

	const DAEMON_MAX_CHILD_RUNTIME = "DAEMON_MAX_CHILD_RUNTIME";
	// in seconds, terminate update tasks that ran longer than this interval

	const DAEMON_MAX_JOBS = "DAEMON_MAX_JOBS";
	// max concurrent update jobs forking update daemon starts

	const FEED_FETCH_TIMEOUT = "FEED_FETCH_TIMEOUT";
	// How long to wait for response when requesting feed from a site (seconds)

	const FEED_FETCH_NO_CACHE_TIMEOUT = "FEED_FETCH_NO_CACHE_TIMEOUT";
	// Same but not cached

	const FILE_FETCH_TIMEOUT = "FILE_FETCH_TIMEOUT";
	// Default timeout when fetching files from remote sites

	const FILE_FETCH_CONNECT_TIMEOUT = "FILE_FETCH_CONNECT_TIMEOUT";
	// How long to wait for initial response from website when fetching files from remote sites

	const DAEMON_UPDATE_LOGIN_LIMIT = "DAEMON_UPDATE_LOGIN_LIMIT";
	// stop updating feeds if user haven't logged in for X days

	const DAEMON_FEED_LIMIT = "DAEMON_FEED_LIMIT";
	// how many feeds to update in one batch

	const DAEMON_SLEEP_INTERVAL = "DAEMON_SLEEP_INTERVAL";
	// default sleep interval between feed updates (sec)

	const MAX_CACHE_FILE_SIZE = "MAX_CACHE_FILE_SIZE";
	// do not cache files larger than that (bytes)

	const MAX_DOWNLOAD_FILE_SIZE = "MAX_DOWNLOAD_FILE_SIZE";
	// do not download files larger than that (bytes)

	const MAX_FAVICON_FILE_SIZE = "MAX_FAVICON_FILE_SIZE";
	// max file size for downloaded favicons (bytes)

	const CACHE_MAX_DAYS = "CACHE_MAX_DAYS";
	// max age in days for various automatically cached (temporary) files

	const MAX_CONDITIONAL_INTERVAL = "MAX_CONDITIONAL_INTERVAL";
	// max interval between forced unconditional updates for servers not complying with http if-modified-since (seconds)

	const DAEMON_UNSUCCESSFUL_DAYS_LIMIT = "DAEMON_UNSUCCESSFUL_DAYS_LIMIT";
	// automatically disable updates for feeds which failed to
	// update for this amount of days; 0 disables

	const LOG_SENT_MAIL = "LOG_SENT_MAIL";
	// log all sent emails in the event log

	const HTTP_PROXY = "HTTP_PROXY";
	// use HTTP proxy for requests

	const FORBID_PASSWORD_CHANGES = "FORBID_PASSWORD_CHANGES";
	// prevent users from changing passwords

	const SESSION_NAME = "SESSION_NAME";
	// default session cookie name

	const CHECK_FOR_PLUGIN_UPDATES = "CHECK_FOR_PLUGIN_UPDATES";
	// enable plugin update checker (using git)

	const ENABLE_PLUGIN_INSTALLER = "ENABLE_PLUGIN_INSTALLER";
	// allow installing first party plugins using plugin installer in prefs

	const AUTH_MIN_INTERVAL = "AUTH_MIN_INTERVAL";
	// minimum amount of seconds required between authentication attempts

	// default values for all of the above:
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
		Config::LOG_DESTINATION => [ Logger::LOG_DEST_SQL,			Config::T_STRING ],
		Config::LOCAL_OVERRIDE_STYLESHEET => [ "local-overrides.css",
																					Config::T_STRING ],
		Config::LOCAL_OVERRIDE_JS => [ "local-overrides.js",
																					Config::T_STRING ],
		Config::DAEMON_MAX_CHILD_RUNTIME => [ 1800,					Config::T_INT ],
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
		Config::CHECK_FOR_PLUGIN_UPDATES => [ "true",				Config::T_BOOL ],
		Config::ENABLE_PLUGIN_INSTALLER => [ "true",					Config::T_BOOL ],
		Config::AUTH_MIN_INTERVAL => [ 5,								Config::T_INT ],
	];

	private static $instance;

	private $params = [];
	private $schema_version = null;
	private $version = [];

	/** @var Db_Migrations $migrations */
	private $migrations;

	public static function get_instance() : Config {
		if (self::$instance == null)
			self::$instance = new self();

		return self::$instance;
	}

	private function __clone() {
		//
	}

	function __construct() {
		$ref = new ReflectionClass(get_class($this));

		foreach ($ref->getConstants() as $const => $cvalue) {
			if (isset($this::_DEFAULTS[$const])) {
				$override = getenv($this::_ENVVAR_PREFIX . $const);

				list ($defval, $deftype) = $this::_DEFAULTS[$const];

				$this->params[$cvalue] = [ self::cast_to($override !== false ? $override : $defval, $deftype), $deftype ];
			}
		}
	}

	/* package maintainers who don't use git: if version_static.txt exists in tt-rss root
		directory, its contents are displayed instead of git commit-based version, this could be generated
		based on source git tree commit used when creating the package */

	static function get_version(bool $as_string = true) {
		return self::get_instance()->_get_version($as_string);
	}

	private function _get_version(bool $as_string = true) {
		$root_dir = dirname(__DIR__);

		if (empty($this->version)) {
			$this->version["status"] = -1;

			if (PHP_OS === "Darwin") {
				$ttrss_version["version"] = "UNKNOWN (Unsupported, Darwin)";
			} else if (file_exists("$root_dir/version_static.txt")) {
				$this->version["version"] = trim(file_get_contents("$root_dir/version_static.txt")) . " (Unsupported)";
			} else if (is_dir("$root_dir/.git")) {
				$this->version = self::get_version_from_git($root_dir);

				if ($this->version["status"] != 0) {
					user_error("Unable to determine version: " . $this->version["version"], E_USER_WARNING);

					$this->version["version"] = "UNKNOWN (Unsupported, Git error)";
				}
			} else {
				$this->version["version"] = "UNKNOWN (Unsupported)";
			}
		}

		return $as_string ? $this->version["version"] : $this->version;
	}

	static function get_version_from_git(string $dir) {
		$descriptorspec = [
			1 => ["pipe", "w"], // STDOUT
			2 => ["pipe", "w"], // STDERR
		];

		$rv = [
			"status" => -1,
			"version" => "",
			"commit" => "",
			"timestamp" => 0,
		];

		$proc = proc_open("git --no-pager log --pretty=\"version-%ct-%h\" -n1 HEAD",
						$descriptorspec, $pipes, $dir);

		if (is_resource($proc)) {
			$stdout = trim(stream_get_contents($pipes[1]));
			$stderr = trim(stream_get_contents($pipes[2]));
			$status = proc_close($proc);

			$rv["status"] = $status;

			list($check, $timestamp, $commit) = explode("-", $stdout);

			if ($check == "version") {

				$rv["version"] = strftime("%y.%m", (int)$timestamp) . "-$commit";
				$rv["commit"] = $commit;
				$rv["timestamp"] = $timestamp;

				// proc_close() may return -1 even if command completed successfully
				// so if it looks like we got valid data, we ignore it

				if ($rv["status"] == -1)
					$rv["status"] = 0;

			} else {
				$rv["version"] = T_sprintf("Git error [RC=%d]: %s", $status, $stderr);
			}
		}

		return $rv;
	}

	static function get_migrations() : Db_Migrations {
		return self::get_instance()->_get_migrations();
	}

	private function _get_migrations() : Db_Migrations {
		if (empty($this->migrations)) {
			$this->migrations = new Db_Migrations();
			$this->migrations->initialize(dirname(__DIR__) . "/sql", "ttrss_version", true, self::SCHEMA_VERSION);
		}

		return $this->migrations;
	}

	static function is_migration_needed() : bool {
		return self::get_migrations()->is_migration_needed();
	}

	static function get_schema_version() : int {
		return self::get_migrations()->get_version();
	}

	static function cast_to(string $value, int $type_hint) {
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

		$this->params[$param] = [ self::cast_to($override !== false ? $override : $default, $type_hint), $type_hint ];
	}

	static function add(string $param, string $default, int $type_hint = Config::T_STRING) {
		$instance = self::get_instance();

		return $instance->_add($param, $default, $type_hint);
	}

	static function get(string $param) {
		$instance = self::get_instance();

		return $instance->_get($param);
	}

	/** this returns Config::SELF_URL_PATH sans trailing slash */
	static function get_self_url() : string {
		$self_url_path = self::get(Config::SELF_URL_PATH);

		if (substr($self_url_path, -1) === "/") {
			return substr($self_url_path, 0, -1);
		} else {
			return $self_url_path;
		}
	}

	static function is_server_https() : bool {
		return (!empty($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] != 'off')) ||
			(!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] == 'https');
	}

	/** generates reference self_url_path (no trailing slash) */
	static function make_self_url() : string {
		$proto = self::is_server_https() ? 'https' : 'http';
		$self_url_path = $proto . '://' . $_SERVER["HTTP_HOST"] . $_SERVER["REQUEST_URI"];

		$self_url_path = preg_replace("/\w+\.php(\?.*$)?$/", "", $self_url_path);

		if (substr($self_url_path, -1) === "/") {
			return substr($self_url_path, 0, -1);
		} else {
			return $self_url_path;
		}
	}

	/* sanity check stuff */

	private static function check_mysql_tables() {
		$pdo = Db::pdo();

		$sth = $pdo->prepare("SELECT engine, table_name FROM information_schema.tables WHERE
				table_schema = ? AND table_name LIKE 'ttrss_%' AND engine != 'InnoDB'");
		$sth->execute([self::get(Config::DB_NAME)]);

		$bad_tables = [];

		while ($line = $sth->fetch()) {
			array_push($bad_tables, $line);
		}

		return $bad_tables;
	}

	static function sanity_check() {

		/*
			we don't actually need the DB object right now but some checks below might use ORM which won't be initialized
			because it is set up in the Db constructor, which is why it's a good idea to invoke it as early as possible

			it is a bit of a hack, maybe ORM should be initialized somewhere else (functions.php?)
		*/

		$pdo = Db::pdo();

		$errors = [];

		if (strpos(self::get(Config::PLUGINS), "auth_") === false) {
			array_push($errors, "Please enable at least one authentication module via PLUGINS");
		}

		if (function_exists('posix_getuid') && posix_getuid() == 0) {
			array_push($errors, "Please don't run this script as root.");
		}

		if (version_compare(PHP_VERSION, '7.1.0', '<')) {
			array_push($errors, "PHP version 7.1.0 or newer required. You're using " . PHP_VERSION . ".");
		}

		if (!class_exists("UConverter")) {
			array_push($errors, "PHP UConverter class is missing, it's provided by the Internationalization (intl) module.");
		}

		if (!is_writable(self::get(Config::CACHE_DIR) . "/images")) {
			array_push($errors, "Image cache is not writable (chmod -R 777 ".self::get(Config::CACHE_DIR)."/images)");
		}

		if (!is_writable(self::get(Config::CACHE_DIR) . "/upload")) {
			array_push($errors, "Upload cache is not writable (chmod -R 777 ".self::get(Config::CACHE_DIR)."/upload)");
		}

		if (!is_writable(self::get(Config::CACHE_DIR) . "/export")) {
			array_push($errors, "Data export cache is not writable (chmod -R 777 ".self::get(Config::CACHE_DIR)."/export)");
		}

		if (self::get(Config::SINGLE_USER_MODE) && class_exists("PDO")) {
			if (UserHelper::get_login_by_id(1) != "admin") {
				array_push($errors, "SINGLE_USER_MODE is enabled but default admin account (ID: 1) is not found.");
			}
		}

		if (php_sapi_name() != "cli") {

			if (self::get_schema_version() < 0) {
				array_push($errors, "Base database schema is missing. Either load it manually or perform a migration (<code>update.php --update-schema</code>)");
			}

			$ref_self_url_path = self::make_self_url();

			if ($ref_self_url_path) {
				$ref_self_url_path = preg_replace("/\w+\.php$/", "", $ref_self_url_path);
			}

			if (self::get_self_url() == "http://example.org/tt-rss") {
				$hint = $ref_self_url_path ? "(possible value: <b>$ref_self_url_path</b>)" : "";
				array_push($errors,
						"Please set SELF_URL_PATH to the correct value for your server: $hint");
			}

			if (self::get_self_url() != $ref_self_url_path) {
				array_push($errors,
					"Please set SELF_URL_PATH to the correct value detected for your server: <b>$ref_self_url_path</b> (you're using: <b>" . self::get_self_url() . "</b>)");
			}
		}

		if (!is_writable(self::get(Config::ICONS_DIR))) {
			array_push($errors, "ICONS_DIR defined in config.php is not writable (chmod -R 777 ".self::get(Config::ICONS_DIR).").\n");
		}

		if (!is_writable(self::get(Config::LOCK_DIRECTORY))) {
			array_push($errors, "LOCK_DIRECTORY is not writable (chmod -R 777 ".self::get(Config::LOCK_DIRECTORY).").\n");
		}

		if (!function_exists("curl_init") && !ini_get("allow_url_fopen")) {
			array_push($errors, "PHP configuration option allow_url_fopen is disabled, and CURL functions are not present. Either enable allow_url_fopen or install PHP extension for CURL.");
		}

		if (!function_exists("json_encode")) {
			array_push($errors, "PHP support for JSON is required, but was not found.");
		}

		if (!class_exists("PDO")) {
			array_push($errors, "PHP support for PDO is required but was not found.");
		}

		if (!function_exists("mb_strlen")) {
			array_push($errors, "PHP support for mbstring functions is required but was not found.");
		}

		if (!function_exists("hash")) {
			array_push($errors, "PHP support for hash() function is required but was not found.");
		}

		if (ini_get("safe_mode")) {
			array_push($errors, "PHP safe mode setting is obsolete and not supported by tt-rss.");
		}

		if (!function_exists("mime_content_type")) {
			array_push($errors, "PHP function mime_content_type() is missing, try enabling fileinfo module.");
		}

		if (!class_exists("DOMDocument")) {
			array_push($errors, "PHP support for DOMDocument is required, but was not found.");
		}

		if (self::get(Config::DB_TYPE) == "mysql") {
			$bad_tables = self::check_mysql_tables();

			if (count($bad_tables) > 0) {
				$bad_tables_fmt = [];

				foreach ($bad_tables as $bt) {
					array_push($bad_tables_fmt, sprintf("%s (%s)", $bt['table_name'], $bt['engine']));
				}

				$msg = "<p>The following tables use an unsupported MySQL engine: <b>" .
					implode(", ", $bad_tables_fmt) . "</b>.</p>";

				$msg .= "<p>The only supported engine on MySQL is InnoDB. MyISAM lacks functionality to run
					tt-rss.
					Please backup your data (via OPML) and re-import the schema before continuing.</p>
					<p><b>WARNING: importing the schema would mean LOSS OF ALL YOUR DATA.</b></p>";


				array_push($errors, $msg);
			}
		}

		if (count($errors) > 0 && php_sapi_name() != "cli") { ?>
			<!DOCTYPE html>
			<html>
				<head>
					<title>Startup failed</title>
					<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
					<link rel="stylesheet" type="text/css" href="themes/light.css">
				</head>
				<body class="sanity_failed flat ttrss_utility">
					<div class="content">
						<h1>Startup failed</h1>

						<p>Please fix errors indicated by the following messages:</p>

						<?php foreach ($errors as $error) { echo self::format_error($error); } ?>

						<p>You might want to check tt-rss <a target="_blank" href="https://tt-rss.org/wiki.php">wiki</a> or the
							<a target="_blank" href="https://community.tt-rss.org/">forums</a> for more information. Please search the forums before creating new topic
							for your question.</p>
					</div>
				</body>
			</html>

		<?php
			die;
		} else if (count($errors) > 0) {
			echo "Please fix errors indicated by the following messages:\n\n";

			foreach ($errors as $error) {
				echo " * " . strip_tags($error)."\n";
			}

			echo "\nYou might want to check tt-rss wiki or the forums for more information.\n";
			echo "Please search the forums before creating new topic for your question.\n";

			exit(1);
		}
	}

	private static function format_error($msg) {
		return "<div class=\"alert alert-danger\">$msg</div>";
	}

	static function get_override_links() {
		$rv = "";

		$local_css = get_theme_path(self::get(self::LOCAL_OVERRIDE_STYLESHEET));
		if ($local_css) $rv .= stylesheet_tag($local_css);

		$local_js = get_theme_path(self::get(self::LOCAL_OVERRIDE_JS));
		if ($local_js) $rv .= javascript_tag($local_js);

		return $rv;
	}
}
