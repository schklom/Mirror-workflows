<?php
class No_Iframes extends Plugin {
	private $host;

	function about() {
		return array(null,
			"Remove embedded iframes (unless whitelisted)",
			"fox");
	}

	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_SANITIZE, $this);
	}

	function hook_sanitize($doc, $site_url, $allowed_elements, $disallowed_attributes) {

		$xpath = new DOMXpath($doc);
		$entries = $xpath->query('//iframe');

		foreach ($entries as $entry) {
			if (!Sanitizer::iframe_whitelisted($entry))
				$entry->parentNode->removeChild($entry);
		}

		return array($doc, $allowed_elements, $disallowed_attributes);
	}

	function api_version() {
		return 2;
	}

}
