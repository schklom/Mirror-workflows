<?php
	define('EXPECTED_CONFIG_VERSION', 26);
	define('SCHEMA_VERSION', 140);

	define('LABEL_BASE_INDEX', -1024);
	define('PLUGIN_FEED_BASE_INDEX', -128);

	define('COOKIE_LIFETIME_LONG', 86400*365);

	// this CSS file is included for everyone (if it exists in themes.local)
	// on login, registration, and main (index and prefs) pages
	define('LOCAL_OVERRIDE_STYLESHEET', '.local-overrides.css');

	$fetch_last_error = false;
	$fetch_last_error_code = false;
	$fetch_last_content_type = false;
	$fetch_last_error_content = false; // curl only for the time being
	$fetch_effective_url = false;
	$fetch_curl_used = false;

	if (version_compare(PHP_VERSION, '8.0.0', '<')) {
		libxml_disable_entity_loader(true);
	}

	libxml_use_internal_errors(true);

	// separate test because this is included before sanity checks
	if (function_exists("mb_internal_encoding")) mb_internal_encoding("UTF-8");

	date_default_timezone_set('UTC');
	if (defined('E_DEPRECATED')) {
		error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
	} else {
		error_reporting(E_ALL & ~E_NOTICE);
	}

	ini_set('display_errors', 0);
	ini_set('display_startup_errors', 0);

	require_once 'config.php';

	/**
	 * Define a constant if not already defined
	 */
	function define_default($name, $value) {
		defined($name) or define($name, $value);
	}

	/* Some tunables you can override in config.php using define():	*/

	define_default('FEED_FETCH_TIMEOUT', 45);
	// How may seconds to wait for response when requesting feed from a site
	define_default('FEED_FETCH_NO_CACHE_TIMEOUT', 15);
	// How may seconds to wait for response when requesting feed from a
	// site when that feed wasn't cached before
	define_default('FILE_FETCH_TIMEOUT', 45);
	// Default timeout when fetching files from remote sites
	define_default('FILE_FETCH_CONNECT_TIMEOUT', 15);
	// How many seconds to wait for initial response from website when
	// fetching files from remote sites
	define_default('DAEMON_UPDATE_LOGIN_LIMIT', 30);
	// stop updating feeds if users haven't logged in for X days
	define_default('DAEMON_FEED_LIMIT', 500);
	// feed limit for one update batch
	define_default('DAEMON_SLEEP_INTERVAL', 120);
	// default sleep interval between feed updates (sec)
	define_default('MAX_CACHE_FILE_SIZE', 64*1024*1024);
	// do not cache files larger than that (bytes)
	define_default('MAX_DOWNLOAD_FILE_SIZE', 16*1024*1024);
	// do not download general files larger than that (bytes)
	define_default('CACHE_MAX_DAYS', 7);
	// max age in days for various automatically cached (temporary) files
	define_default('MAX_CONDITIONAL_INTERVAL', 3600*12);
	// max interval between forced unconditional updates for servers
	// not complying with http if-modified-since (seconds)
	// define_default('MAX_FETCH_REQUESTS_PER_HOST', 25);
	// a maximum amount of allowed HTTP requests per destination host
	// during a single update (i.e. within PHP process lifetime)
	// this is used to not cause excessive load on the origin server on
	// e.g. feed subscription when all articles are being processes
	// (not implemented)
	define_default('DAEMON_UNSUCCESSFUL_DAYS_LIMIT', 30);
	// automatically disable updates for feeds which failed to
	// update for this amount of days; 0 disables

	/* tunables end here */

	if (DB_TYPE == "pgsql") {
		define('SUBSTRING_FOR_DATE', 'SUBSTRING_FOR_DATE');
	} else {
		define('SUBSTRING_FOR_DATE', 'SUBSTRING');
	}

	/**
	 * Return available translations names.
	 *
	 * @access public
	 * @return array A array of available translations.
	 */
	function get_translations() {
		$tr = array(
					"auto"  => __("Detect automatically"),
					"ar_SA" => "العربيّة (Arabic)",
					"bg_BG" => "Bulgarian",
					"da_DA" => "Dansk",
					"ca_CA" => "Català",
					"cs_CZ" => "Česky",
					"en_US" => "English",
					"el_GR" => "Ελληνικά",
					"es_ES" => "Español (España)",
					"es_LA" => "Español",
					"de_DE" => "Deutsch",
					"fa"    => "Persian (Farsi)",
					"fr_FR" => "Français",
					"hu_HU" => "Magyar (Hungarian)",
					"it_IT" => "Italiano",
					"ja_JP" => "日本語 (Japanese)",
					"lv_LV" => "Latviešu",
					"nb_NO" => "Norwegian bokmål",
					"nl_NL" => "Dutch",
					"pl_PL" => "Polski",
					"ru_RU" => "Русский",
					"pt_BR" => "Portuguese/Brazil",
					"pt_PT" => "Portuguese/Portugal",
					"zh_CN" => "Simplified Chinese",
					"zh_TW" => "Traditional Chinese",
					"uk_UA" => "Українська",
					"sv_SE" => "Svenska",
					"fi_FI" => "Suomi",
					"tr_TR" => "Türkçe");

		return $tr;
	}

	require_once "lib/accept-to-gettext.php";
	require_once "lib/gettext/gettext.inc.php";

	function startup_gettext() {

		# Get locale from Accept-Language header
		$lang = al2gt(array_keys(get_translations()), "text/html");

		if (defined('_TRANSLATION_OVERRIDE_DEFAULT')) {
			$lang = _TRANSLATION_OVERRIDE_DEFAULT;
		}

		if ($_SESSION["uid"] && get_schema_version() >= 120) {
			$pref_lang = get_pref("USER_LANGUAGE", $_SESSION["uid"]);

			if ($pref_lang && $pref_lang != 'auto') {
				$lang = $pref_lang;
			}
		}

		if ($lang) {
			if (defined('LC_MESSAGES')) {
				_setlocale(LC_MESSAGES, $lang);
			} else if (defined('LC_ALL')) {
				_setlocale(LC_ALL, $lang);
			}

			_bindtextdomain("messages", "locale");
			_textdomain("messages");
			_bind_textdomain_codeset("messages", "UTF-8");
		}
	}

	require_once 'db-prefs.php';
	require_once 'controls.php';

	define('SELF_USER_AGENT', 'Tiny Tiny RSS/' . get_version() . ' (http://tt-rss.org/)');
	ini_set('user_agent', SELF_USER_AGENT);

	$schema_version = false;

	/* compat shims */

	function _debug($msg) {
	    Debug::log($msg);
	}

	// @deprecated
	function getFeedUnread($feed, $is_cat = false) {
		return Feeds::getFeedArticles($feed, $is_cat, true, $_SESSION["uid"]);
	}

	// @deprecated
	function sanitize($str, $force_remove_images = false, $owner = false, $site_url = false, $highlight_words = false, $article_id = false) {
		return Sanitizer::sanitize($str, $force_remove_images, $owner, $site_url, $highlight_words, $article_id);
	}

	// @deprecated
	function fetch_file_contents($params) {
		return UrlHelper::fetch($params);
	}

	// @deprecated
	function rewrite_relative_url($url, $rel_url) {
		return UrlHelper::rewrite_relative($url, $rel_url);
	}

	// @deprecated
	function validate_url($url) {
		return UrlHelper::validate($url);
	}

	// @deprecated
	function authenticate_user($login, $password, $check_only = false, $service = false) {
		return UserHelper::authenticate($login, $password, $check_only, $service);
	}

	// @deprecated
	function smart_date_time($timestamp, $tz_offset = 0, $owner_uid = false, $eta_min = false) {
		return TimeHelper::smart_date_time($timestamp, $tz_offset, $owner_uid, $eta_min);
	}

	// @deprecated
	function make_local_datetime($timestamp, $long, $owner_uid = false, $no_smart_dt = false, $eta_min = false) {
		return TimeHelper::make_local_datetime($timestamp, $long, $owner_uid, $no_smart_dt, $eta_min);
	}

	/* end compat shims */

	function get_ssl_certificate_id() {
		if ($_SERVER["REDIRECT_SSL_CLIENT_M_SERIAL"]) {
			return sha1($_SERVER["REDIRECT_SSL_CLIENT_M_SERIAL"] .
				$_SERVER["REDIRECT_SSL_CLIENT_V_START"] .
				$_SERVER["REDIRECT_SSL_CLIENT_V_END"] .
				$_SERVER["REDIRECT_SSL_CLIENT_S_DN"]);
		}
		if ($_SERVER["SSL_CLIENT_M_SERIAL"]) {
			return sha1($_SERVER["SSL_CLIENT_M_SERIAL"] .
				$_SERVER["SSL_CLIENT_V_START"] .
				$_SERVER["SSL_CLIENT_V_END"] .
				$_SERVER["SSL_CLIENT_S_DN"]);
		}
		return "";
	}

	// this is used for user http parameters unless HTML code is actually needed
	function clean($param) {
		if (is_array($param)) {
			return array_map("strip_tags", $param);
		} else if (is_string($param)) {
			return strip_tags($param);
		} else {
			return $param;
		}
	}

	function make_password($length = 12) {
		$password = "";
		$possible = "0123456789abcdfghjkmnpqrstvwxyzABCDFGHJKMNPQRSTVWXYZ*%+^";

		$i = 0;

		while ($i < $length) {

			try {
				$idx = function_exists("random_int") ? random_int(0, strlen($possible) - 1) : mt_rand(0, strlen($possible) - 1);
			} catch (Exception $e) {
				$idx = mt_rand(0, strlen($possible) - 1);
			}

			$char = substr($possible, $idx, 1);

			if (!strstr($password, $char)) {
				$password .= $char;
				$i++;
			}
		}

		return $password;
	}

	function validate_csrf($csrf_token) {
		return isset($csrf_token) && hash_equals($_SESSION['csrf_token'], $csrf_token);
	}

	function truncate_string($str, $max_len, $suffix = '&hellip;') {
		if (mb_strlen($str, "utf-8") > $max_len) {
			return mb_substr($str, 0, $max_len, "utf-8") . $suffix;
		} else {
			return $str;
		}
	}

	function mb_substr_replace($original, $replacement, $position, $length) {
		$startString = mb_substr($original, 0, $position, "UTF-8");
		$endString = mb_substr($original, $position + $length, mb_strlen($original), "UTF-8");

		$out = $startString . $replacement . $endString;

		return $out;
	}

	function truncate_middle($str, $max_len, $suffix = '&hellip;') {
		if (mb_strlen($str) > $max_len) {
			return mb_substr_replace($str, $suffix, $max_len / 2, mb_strlen($str) - $max_len);
		} else {
			return $str;
		}
	}

	function sql_bool_to_bool($s) {
		return $s && ($s !== "f" && $s !== "false"); //no-op for PDO, backwards compat for legacy layer
	}

	function bool_to_sql_bool($s) {
		return $s ? 1 : 0;
	}

	// Session caching removed due to causing wrong redirects to upgrade
	// script when get_schema_version() is called on an obsolete session
	// created on a previous schema version.
	function get_schema_version($nocache = false) {
		global $schema_version;

		$pdo = Db::pdo();

		if (!$schema_version && !$nocache) {
			$row = $pdo->query("SELECT schema_version FROM ttrss_version")->fetch();
			$version = $row["schema_version"];
			$schema_version = $version;
			return $version;
		} else {
			return $schema_version;
		}
	}

	function sanity_check() {
		require_once 'errors.php';
		$ERRORS = get_error_types();

		$error_code = 0;
		$schema_version = get_schema_version(true);

		if ($schema_version != SCHEMA_VERSION) {
			$error_code = 5;
		}

		return array("code" => $error_code, "message" => $ERRORS[$error_code]);
	}

	function file_is_locked($filename) {
		if (file_exists(LOCK_DIRECTORY . "/$filename")) {
			if (function_exists('flock')) {
				$fp = @fopen(LOCK_DIRECTORY . "/$filename", "r");
				if ($fp) {
					if (flock($fp, LOCK_EX | LOCK_NB)) {
						flock($fp, LOCK_UN);
						fclose($fp);
						return false;
					}
					fclose($fp);
					return true;
				} else {
					return false;
				}
			}
			return true; // consider the file always locked and skip the test
		} else {
			return false;
		}
	}

	function make_lockfile($filename) {
		$fp = fopen(LOCK_DIRECTORY . "/$filename", "w");

		if ($fp && flock($fp, LOCK_EX | LOCK_NB)) {
			$stat_h = fstat($fp);
			$stat_f = stat(LOCK_DIRECTORY . "/$filename");

			if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
				if ($stat_h["ino"] != $stat_f["ino"] ||
						$stat_h["dev"] != $stat_f["dev"]) {

					return false;
				}
			}

			if (function_exists('posix_getpid')) {
				fwrite($fp, posix_getpid() . "\n");
			}
			return $fp;
		} else {
			return false;
		}
	}

	function checkbox_to_sql_bool($val) {
		return ($val == "on") ? 1 : 0;
	}

	function uniqid_short() {
		return uniqid(base_convert(rand(), 10, 36));
	}

	function T_sprintf() {
		$args = func_get_args();
		return vsprintf(__(array_shift($args)), $args);
	}

	function T_nsprintf() {
		$args = func_get_args();
		return vsprintf(_ngettext(array_shift($args), array_shift($args), array_shift($args)), $args);
	}

	function is_server_https() {
		return (!empty($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] != 'off')) || $_SERVER['HTTP_X_FORWARDED_PROTO'] == 'https';
	}

	function is_prefix_https() {
		return parse_url(SELF_URL_PATH, PHP_URL_SCHEME) == 'https';
	}

	// this returns SELF_URL_PATH sans ending slash
	function get_self_url_prefix() {
		if (strrpos(SELF_URL_PATH, "/") === strlen(SELF_URL_PATH)-1) {
			return substr(SELF_URL_PATH, 0, strlen(SELF_URL_PATH)-1);
		} else {
			return SELF_URL_PATH;
		}
	}

	function encrypt_password($pass, $salt = '', $mode2 = false) {
		if ($salt && $mode2) {
			return "MODE2:" . hash('sha256', $salt . $pass);
		} else if ($salt) {
			return "SHA1X:" . sha1("$salt:$pass");
		} else {
			return "SHA1:" . sha1($pass);
		}
	} // function encrypt_password

	function init_plugins() {
		PluginHost::getInstance()->load(PLUGINS, PluginHost::KIND_ALL);

		return true;
	}

	if (!function_exists('gzdecode')) {
		function gzdecode($string) { // no support for 2nd argument
			return file_get_contents('compress.zlib://data:who/cares;base64,'.
				base64_encode($string));
		}
	}

	function get_random_bytes($length) {
		if (function_exists('random_bytes')) {
			return random_bytes($length);
		} else if (function_exists('openssl_random_pseudo_bytes')) {
			return openssl_random_pseudo_bytes($length);
		} else {
			$output = "";

			for ($i = 0; $i < $length; $i++)
				$output .= chr(mt_rand(0, 255));

			return $output;
		}
	}

	function read_stdin() {
		$fp = fopen("php://stdin", "r");

		if ($fp) {
			$line = trim(fgets($fp));
			fclose($fp);
			return $line;
		}

		return null;
	}

	function implements_interface($class, $interface) {
		return in_array($interface, class_implements($class));
	}

	function T_js_decl($s1, $s2) {
		if ($s1 && $s2) {
			$s1 = preg_replace("/\n/", "", $s1);
			$s2 = preg_replace("/\n/", "", $s2);

			$s1 = preg_replace("/\"/", "\\\"", $s1);
			$s2 = preg_replace("/\"/", "\\\"", $s2);

			return "T_messages[\"$s1\"] = \"$s2\";\n";
		}
	}

	function init_js_translations() {

		print 'var T_messages = new Object();

			function __(msg) {
				if (T_messages[msg]) {
					return T_messages[msg];
				} else {
					return msg;
				}
			}

			function ngettext(msg1, msg2, n) {
				return __((parseInt(n) > 1) ? msg2 : msg1);
			}';

		global $text_domains;

		foreach (array_keys($text_domains) as $domain) {
			$l10n = _get_reader($domain);

			for ($i = 0; $i < $l10n->total; $i++) {
				$orig = $l10n->get_original_string($i);
				if(strpos($orig, "\000") !== false) { // Plural forms
					$key = explode(chr(0), $orig);
					print T_js_decl($key[0], _ngettext($key[0], $key[1], 1)); // Singular
					print T_js_decl($key[1], _ngettext($key[0], $key[1], 2)); // Plural
				} else {
					$translation = _dgettext($domain,$orig);
					print T_js_decl($orig, $translation);
				}
			}

		}
	}

	function get_theme_path($theme) {
		$check = "themes/$theme";
		if (file_exists($check)) return $check;

		$check = "themes.local/$theme";
		if (file_exists($check)) return $check;
	}

	function theme_exists($theme) {
		return file_exists("themes/$theme") || file_exists("themes.local/$theme");
	}

	/**
	 * @SuppressWarnings(unused)
	 */
	function error_json($code) {
		require_once "errors.php";
		$ERRORS = get_error_types();

		@$message = $ERRORS[$code];

		return json_encode(array("error" =>
			array("code" => $code, "message" => $message)));

	}

	function arr_qmarks($arr) {
		return str_repeat('?,', count($arr) - 1) . '?';
	}

	function get_scripts_timestamp() {
		$files = glob("js/*.js");
		$ts = 0;

		foreach ($files as $file) {
			$file_ts = filemtime($file);
			if ($file_ts > $ts) $ts = $file_ts;
		}

		return $ts;
	}

	/* for package maintainers who don't use git: if version_static.txt exists in tt-rss root
		directory, its contents are displayed instead of git commit-based version, this could be generated
		based on source git tree commit used when creating the package */

	function get_version(&$git_commit = false, &$git_timestamp = false, &$last_error = false) {
		global $ttrss_version;

		if (is_array($ttrss_version) && isset($ttrss_version['version'])) {
			$git_commit = $ttrss_version['commit'];
			$git_timestamp = $ttrss_version['timestamp'];
			$last_error = $ttrss_version['last_error'];

			return $ttrss_version['version'];
		} else {
			$ttrss_version = [];
		}

		$ttrss_version['version'] = "UNKNOWN (Unsupported)";

		date_default_timezone_set('UTC');
		$root_dir = dirname(dirname(__FILE__));

		if (PHP_OS === "Darwin") {
			$ttrss_version['version'] = "UNKNOWN (Unsupported, Darwin)";
		} else if (file_exists("$root_dir/version_static.txt")) {
			$ttrss_version['version'] = trim(file_get_contents("$root_dir/version_static.txt")) . " (Unsupported)";
		} else if (is_dir("$root_dir/.git")) {
			$rc = 0;
			$output = [];

			$cwd = getcwd();

			chdir($root_dir);
			exec('git --no-pager log --pretty="version: %ct %h" -n1 HEAD 2>&1', $output, $rc);
			chdir($cwd);

			if (is_array($output) && count($output) > 0) {
				list ($test, $timestamp, $commit) = explode(" ", $output[0], 3);

				if ($test == "version:") {
					$git_commit = $commit;
					$git_timestamp = $timestamp;

					$ttrss_version['version'] = strftime("%y.%m", $timestamp) . "-$commit";
					$ttrss_version['commit'] = $commit;
					$ttrss_version['timestamp'] = $timestamp;
				}
			}

			if (!isset($ttrss_version['commit'])) {
				$last_error = "Unable to determine version (using $root_dir): RC=$rc; OUTPUT=" . implode("\n", $output);

				$ttrss_version["last_error"] = $last_error;

				user_error($last_error, E_USER_WARNING);
			}
		}

		return $ttrss_version['version'];
	}
