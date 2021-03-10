/* global Plugins, __, require, PluginHost, App, dojo */

Plugins.Shorten_Expanded = {
	threshold: 1.5, // of window height
	shorten_if_needed: function(row) {

		const content = row.querySelector(".content");
		const content_inner = row.querySelector(".content-inner");

		console.log('shorten_expanded', row.id, content.offsetHeight, 'vs', this.threshold * window.innerHeight);

		if (content && content_inner && content.offsetHeight >= this.threshold * window.innerHeight) {

			const attachments = row.querySelector(".attachments-inline"); // optional

			content_inner.innerHTML = `
				<div class="content-shrink-wrap">
					${content_inner.innerHTML}
					${attachments ? attachments.innerHTML : ''}
				</div>
				<button dojoType="dijit.form.Button" class="alt-info expand-prompt" onclick="return Plugins.Shorten_Expanded.expand('${row.id}')" href="#">
					${App.FormFields.icon('add')}
					${__("Expand article")}
				</button>`;

			if (attachments)
				attachments.innerHTML = "";

			dojo.parser.parse(content_inner);

			return true;
		}
		return false;
	},
	process_row: function(row) {

		if (this.shorten_if_needed(row))
			return;

		const promises = [];

		[...row.querySelectorAll("img, video")].forEach((img) => {
			const promise = new Promise((resolve, reject) => {

				// lazy load breaks our calculations
				img.removeAttribute('loading');

				img.onload = () => resolve(img);
				img.onloadeddata = () => resolve(img);
				img.error = () => reject(new Error("unable to load video"));
				img.onerror = () => reject(new Error("unable to load image"));
			});

			const timeout = new Promise((resolve, reject) => {
				const id = setTimeout(() => {
					clearTimeout(id);
					reject(new Error("timed out"));
				}, 2000)
			})

			promises.push(Promise.race([promise, timeout]));
		});

		Promise.allSettled(promises).then(() => {
			this.shorten_if_needed(row);
		});
	},
	expand: function(id) {
		const row = App.byId(id);

		if (row) {
			const content = row.querySelector(".content-shrink-wrap");
			const link = row.querySelector(".expand-prompt");

			if (content) content.removeClassName("content-shrink-wrap");
			if (link) Element.hide(link);
		}

		return false;
	}
}

require(['dojo/_base/kernel', 'dojo/ready'], function  (dojo, ready) {
	ready(function() {
		PluginHost.register(PluginHost.HOOK_ARTICLE_RENDERED_CDM, function(row) {
			Plugins.Shorten_Expanded.process_row(row);
			return true;
		});
	});
});
