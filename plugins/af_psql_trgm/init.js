/* global dijit, Plugins, __ */

Plugins.Psql_Trgm = {
	showRelated: function (id) {
		const query = "backend.php?op=pluginhandler&plugin=af_psql_trgm&method=showrelated&param=" + encodeURIComponent(id);

		const dialog = new dijit.Dialog({
			title: __("Related articles"),
			execute: function () {
				//
			},
			href: query,
		});

		dialog.show();
	}
};

