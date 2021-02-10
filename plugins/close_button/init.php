<?php
class Close_Button extends Plugin {
	private $host;

	function init($host) {
		$this->host = $host;

		$host->add_hook($host::HOOK_ARTICLE_BUTTON, $this);
	}

	function about() {
		return array(1.0,
			"Adds a button to close article panel",
			"fox");
	}

	function get_css() {
		return "i.icon-close-article { color : red; }";
	}

	function hook_article_button($line) {
		if (!get_pref("COMBINED_DISPLAY_MODE")) {
			return "<i class='material-icons icon-close-article'
				style='cursor : pointer' onclick='Article.close()'
				title='".__('Close article')."'>close</i>";
		}
	}

	function api_version() {
		return 2;
	}

}
