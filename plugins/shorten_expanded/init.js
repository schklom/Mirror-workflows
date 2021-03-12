/* global Plugins, __, require, PluginHost, App, dojo */

Plugins.Shorten_Expanded = {
	threshold: 1.5, // of window height
	observer: new ResizeObserver((entries) => {
		entries.forEach((entry) => {
			const row = entry.target;

			Plugins.Shorten_Expanded.shorten_if_needed(row);
		});
	}),
	shorten_if_needed: function(row) {

		const content = row.querySelector(".content");
		const content_inner = row.querySelector(".content-inner");

		//console.log('shorten_expanded', row.id, content.offsetHeight, 'vs', this.threshold * window.innerHeight);

		if (content && content_inner && !row.hasAttribute('data-already-shortened') && content.offsetHeight >= this.threshold * window.innerHeight) {

			row.setAttribute('data-already-shortened', true);

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

		this.observer.observe(row);
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
