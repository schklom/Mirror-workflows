/* global dojo, Plugins, App, Notify, fox, xhr, __ */

Plugins.Share = {
	shareArticle: function(id) {
		const dialog = new fox.SingleUseDialog({
			id: "shareArticleDlg",
			title: __("Share article by URL"),
			newurl: function () {
				if (confirm(__("Generate new share URL for this article?"))) {

					Notify.progress("Trying to change URL...", true);

					xhr.json("backend.php", App.getPhArgs("share", "newkey", {id: id}), (reply) => {
						if (reply) {
							const new_link = reply.link;
							const target = dialog.domNode.querySelector(".target-url");

							if (new_link && target) {

								target.innerHTML = target.innerHTML.replace(/&amp;key=.*$/,
									"&amp;key=" + new_link);

								target.href = target.href.replace(/&key=.*$/,
									"&key=" + new_link);

								const icon = document.querySelector(".share-icon-" + id);

								if (icon)
									icon.addClassName("is-shared");

								Notify.close();

							} else {
								Notify.error("Could not change URL.");
							}
						}
					});
				}

			},
			unshare: function () {
				if (confirm(__("Remove sharing for this article?"))) {
					xhr.post("backend.php", App.getPhArgs("share", "unshare", {id: id}), (reply) => {
						Notify.info(reply);

						const icon = document.querySelector(".share-icon-" + id);

						if (icon)
							icon.removeClassName("is-shared");

						dialog.hide();
					});
				}

			},
			content: __("Loading, please wait...")
		});

		const tmph = dojo.connect(dialog, 'onShow', function () {
			dojo.disconnect(tmph);

			xhr.post("backend.php", App.getPhArgs("share", "shareDialog", {id: id}), (reply) => {
				dialog.attr('content', reply)

				const icon = document.querySelector(".share-icon-" + id);

				if (icon)
					icon.addClassName("is-shared");
			});
		});

		dialog.show();
	}
}
