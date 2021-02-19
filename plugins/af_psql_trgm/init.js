/* global dijit, dojo, Plugins, xhr, __ */

Plugins.Psql_Trgm = {
	showRelated: function (id) {
		const dialog = new dijit.Dialog({
			title: __("Related articles"),
			content: __("Loading, please wait...")
		});

		const tmph = dojo.connect(dialog, "onShow", null, function (/* e */) {
			dojo.disconnect(tmph);

			xhr.post("backend.php", {op: 'pluginhandler', plugin: 'af_psql_trgm', method: 'showrelated', id: id}, (reply) => {
				dialog.attr('content', reply);
			});
		});

		dialog.show();
	}
};

