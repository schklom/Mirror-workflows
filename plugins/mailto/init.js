/* global Plugins, Headlines, xhrPost, dojo, fox, __ */

Plugins.Mailto = {
	send: function (id) {
		if (!id) {
			const ids = Headlines.getSelected();

			if (ids.length == 0) {
				alert(__("No articles selected."));
				return;
			}

			id = ids.toString();
		}

		const dialog = new fox.SingleUseDialog({
			title: __("Forward article by email (mailto:)"),
			content: __("Loading, please wait...")
		});

		const tmph = dojo.connect(dialog, 'onShow', function () {
			dojo.disconnect(tmph);

			xhrPost("backend.php", App.getPhArgs("mailto", "emailArticle", {ids: id}), (transport) => {
				dialog.attr('content', transport.responseText);
			});
		});


		dialog.show();
	}
};

// override default hotkey action if enabled
Plugins.Mail = Plugins.Mail || {};

Plugins.Mail.onHotkey = function(id) {
	Plugins.Mailto.send(id);
};
