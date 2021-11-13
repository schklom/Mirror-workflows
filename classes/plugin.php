<?php
abstract class Plugin {
	const API_VERSION_COMPAT = 1;

	/** @var PDO $pdo */
	protected $pdo;

	abstract function init($host);

	/** @return array<float|string|bool> */
	abstract function about();
	// return array(1.0, "plugin", "No description", "No author", false);

	function __construct() {
		$this->pdo = Db::pdo();
	}

	/** @return array<string,int> */
	function flags() {
		/* associative array, possible keys:
			needs_curl = boolean
		*/
		return array();
	}

	function is_public_method($method) {
		return false;
	}

	function csrf_ignore($method) {
		return false;
	}

	function get_js() {
		return "";
	}

	function get_prefs_js() {
		return "";
	}

	function api_version() {
		return Plugin::API_VERSION_COMPAT;
	}

	/* gettext-related helpers */

	function __($msgid) {
		/** @var Plugin $this -- this is a strictly template-related hack */
		return _dgettext(PluginHost::object_to_domain($this), $msgid);
	}

	function _ngettext($singular, $plural, $number) {
		/** @var Plugin $this -- this is a strictly template-related hack */
		return _dngettext(PluginHost::object_to_domain($this), $singular, $plural, $number);
	}

	function T_sprintf() {
		$args = func_get_args();
		$msgid = array_shift($args);

		return vsprintf($this->__($msgid), $args);
	}
}
