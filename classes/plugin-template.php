<?php
abstract class PluginTemplate {
	const API_VERSION_COMPAT = 1;

	/** @var PDO $pdo */
	protected $pdo;

	abstract function init(PluginHost $host) : void;

	/** @return array<float|string|bool> */
	abstract function about() : array;
	// return array(1.0, "plugin", "No description", "No author", false);

	function __construct() {
		$this->pdo = Db::pdo();
	}

	/** @return array<string,int> */
	function flags() : array {
		/* associative array, possible keys:
			needs_curl = boolean
		*/
		return array();
	}

	function is_public_method(string $method) : bool {
		return false;
	}

	function csrf_ignore(string $method) : bool {
		return false;
	}

	function get_js() : string {
		return "";
	}

	function get_prefs_js() : string {
		return "";
	}

	function api_version() : int {
		return Plugin::API_VERSION_COMPAT;
	}

	/* gettext-related helpers */

	function __(string $msgid) : string {
		/** @var Plugin $this -- this is a strictly template-related hack */
		return _dgettext(PluginHost::object_to_domain($this), $msgid);
	}

	function _ngettext(string $singular, string $plural, int $number) : string {
		/** @var Plugin $this -- this is a strictly template-related hack */
		return _dngettext(PluginHost::object_to_domain($this), $singular, $plural, $number);
	}

	function T_sprintf() : string {
		$args = func_get_args();
		$msgid = array_shift($args);

		return vsprintf($this->__($msgid), $args);
	}

	/** AUTO_GENERATED_HOOKS_GO_HERE **/
}
