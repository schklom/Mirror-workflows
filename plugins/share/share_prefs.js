/* global Plugins, Notify, xhrPost */

Plugins.Share = {
	clearKeys: function() {
		if (confirm(__("This will invalidate all previously shared article URLs. Continue?"))) {
			Notify.progress("Clearing URLs...");

			xhrPost("backend.php", App.getPhArgs("share", "clearArticleKeys"), (transport) => {
				Notify.info(transport.responseText);
			});
		}

		return false;
	}
};
