/* global Plugins, Notify, xhrPost */

Plugins.Share = {
	clearKeys: function() {
		if (confirm(__("This will invalidate all previously shared article URLs. Continue?"))) {
			Notify.progress("Clearing URLs...");

			xhrPost("backend.php", {op: "pluginhandler", plugin: "share", method: "clearArticleKeys"}, (transport) => {
				Notify.info(transport.responseText);
			});
		}

		return false;
	}
};
