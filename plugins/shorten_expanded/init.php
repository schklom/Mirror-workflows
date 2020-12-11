<?php
class Shorten_Expanded extends Plugin {
	private $host;

	function about() {
		return array(1.0,
			"Shorten overly long articles in CDM/expanded",
			"fox");
	}

	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_SANITIZE, $this);
	}

	// native lazy loading messes with plugin height calculation because images get loaded
	// after headline is actually rendered (off screen) so we force disable it
	function hook_sanitize($doc) {
		$xpath = new DOMXPath($doc);

		$entries = $xpath->query('(//*[@loading="lazy"])');

		foreach ($entries as $entry) {
			$entry->removeAttribute("loading");
		}

		return $doc;
	}

	function get_css() {
		return file_get_contents(__DIR__ . "/init.css");
	}

	function get_js() {
		return file_get_contents(__DIR__ . "/init.js");
	}

	function api_version() {
		return 2;
	}

}
