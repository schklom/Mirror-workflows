<?php
class Af_Youtube_Embed extends Plugin {
	private $host;

	function about() {
		return array(null,
			"Embed videos in Youtube RSS feeds (and whitelist Youtube iframes)",
			"fox");
	}

	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_RENDER_ENCLOSURE, $this);
		$host->add_hook($host::HOOK_IFRAME_WHITELISTED, $this);
	}

	function hook_iframe_whitelisted($src) {
		return in_array($src, ["www.youtube.com", "youtube.com", "youtu.be"]);
	}

	function hook_render_enclosure($entry, $hide_images) {

		$matches = array();

		if (preg_match("/\/\/www\.youtube\.com\/v\/([\w-]+)/", $entry["content_url"], $matches) ||
			preg_match("/\/\/www\.youtube\.com\/watch?v=([\w-]+)/", $entry["content_url"], $matches) ||
			preg_match("/\/\/youtu.be\/([\w-]+)/", $entry["content_url"], $matches)) {

			$vid_id = $matches[1];

			return "<iframe class=\"youtube-player\"
				type=\"text/html\" width=\"640\" height=\"385\"
				src=\"https://www.youtube.com/embed/$vid_id\"
				allowfullscreen frameborder=\"0\"></iframe>";

		}
	}

	function api_version() {
		return 2;
	}

}
