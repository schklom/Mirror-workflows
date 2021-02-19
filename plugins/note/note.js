/* global dojo, xhrPost, Plugins, xhrJson, Notify, fox, __ */

Plugins.Note = {
	edit: function(id) {
		const dialog = new fox.SingleUseDialog({
			title: __("Edit article note"),
			execute: function () {
				if (this.validate()) {
					Notify.progress("Saving article note...", true);

					xhr.json("backend.php", this.attr('value'), (reply) => {
						Notify.close();
						dialog.hide();

						if (reply) {
							const elem = App.byId("POSTNOTE-" + id);

							if (elem) {
								elem.innerHTML = reply.note;

								if (reply.raw_length != 0)
									Element.show(elem);
								else
									Element.hide(elem);
							}
						}
					});
				}
			},
			content: __("Loading, please wait...")
		});

		const tmph = dojo.connect(dialog, 'onShow', function () {
			dojo.disconnect(tmph);

			xhrPost("backend.php", App.getPhArgs("note", "edit", {id: id}), (transport) => {
				dialog.attr('content', transport.responseText);
			});
		});

		dialog.show();
	}
};
