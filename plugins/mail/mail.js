/* global Plugins, Headlines, xhrJson, Notify, fox, __ */

Plugins.Mail = {
	send: function(id) {
		if (!id) {
			const ids = Headlines.getSelected();

			if (ids.length == 0) {
				alert(__("No articles selected."));
				return;
			}

			id = ids.toString();
		}

		const query = "backend.php?op=pluginhandler&plugin=mail&method=emailArticle&param=" + encodeURIComponent(id);

		const dialog = new fox.SingleUseDialog({
			id: "emailArticleDlg",
			title: __("Forward article by email"),
			execute: function () {
				if (this.validate()) {
					xhrJson("backend.php", this.attr('value'), (reply) => {
						if (reply) {
							const error = reply['error'];

							if (error) {
								alert(__('Error sending email:') + ' ' + error);
							} else {
								Notify.info('Your message has been sent.');
								dialog.hide();
							}

						}
					});
				}
			},
			href: query
		});

		/* var tmph = dojo.connect(dialog, 'onLoad', function() {
		dojo.disconnect(tmph);

		   new Ajax.Autocompleter('emailArticleDlg_destination', 'emailArticleDlg_dst_choices',
			   "backend.php?op=pluginhandler&plugin=mail&method=completeEmails",
			   { tokens: '', paramName: "search" });
		}); */

		dialog.show();
	},
	onHotkey: function(id) {
		Plugins.Mail.send(id);
	}
};
