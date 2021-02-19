/* global dojo, Plugins, xhr, App, Notify, fox, __ */

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
							App.findAll(`div[data-note-for="${reply.id}"]`).forEach((elem) => {
								elem.querySelector(".body").innerHTML = reply.note;

								if (reply.note)
									elem.show();
								else
									elem.hide();
							});
						}
					});
				}
			},
			content: __("Loading, please wait...")
		});

		const tmph = dojo.connect(dialog, 'onShow', function () {
			dojo.disconnect(tmph);

			xhr.post("backend.php", App.getPhArgs("note", "edit", {id: id}), (reply) => {
				dialog.attr('content', reply);
			});
		});

		dialog.show();
	}
};
