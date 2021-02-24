/* global Plugins, Notify, xhr, App */

Plugins.Share = {
	clearKeys: function() {
		if (confirm(__("This will invalidate all previously shared article URLs. Continue?"))) {
			Notify.progress("Clearing URLs...");

			xhr.post("backend.php", App.getPhArgs("share", "clearArticleKeys"), (reply) => {
				Notify.info(reply);
			});
		}

		return false;
	}
};
