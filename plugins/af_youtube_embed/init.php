<?php
class Af_Youtube_Embed extends Plugin {

	function about() {
		return array(null,
			"Embed videos in Youtube RSS feeds (and whitelist Youtube iframes)",
			"fox");
	}

	function init($host) {
		$host->add_hook($host::HOOK_RENDER_ENCLOSURE, $this);
		$host->add_hook($host::HOOK_IFRAME_WHITELISTED, $this);
	}

	function hook_iframe_whitelisted($src) {
		return in_array($src, ["www.youtube.com", "youtube.com",
			"www.youtube-nocookie.com", "youtube-nocookie.com",
			"youtu.be"]);
	}

	function hook_render_enclosure($entry, $id, $rv) {

		$url = $entry["content_url"];

		if ($vid_id = UrlHelper::url_to_youtube_vid($url)) {

			return "<div class='embed-responsive'>
				<iframe class='youtube-player'
					type='text/html' width='640' height='385'
					src=\"https://www.youtube.com/embed/$vid_id\"
					allowfullscreen frameborder='0'></iframe>
				</div>";

		}

		return "";
	}

	function api_version() {
		return 2;
	}

}
