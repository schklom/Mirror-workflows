<?php
class Scored_Oldest_First extends Plugin {

	function init($host) {
		$host->add_hook($host::HOOK_HEADLINES_CUSTOM_SORT_MAP, $this);
		$host->add_hook($host::HOOK_HEADLINES_CUSTOM_SORT_OVERRIDE, $this);
	}

	function hook_headlines_custom_sort_map() {
		return [
			"dates_reverse_scored" => "Oldest first (with score)"
		];
	}

	function hook_headlines_custom_sort_override($order) {
		if ($order == "dates_reverse_scored") {
			return [ "score DESC, updated", true ];
		} else {
			return [ "", false ];
		}
	}

	function about() {
		return array(1.0,
			"Consider article score while sorting by oldest first",
			"fox",
			false,
			"");
	}

	function api_version() {
		return 2;
	}

}
