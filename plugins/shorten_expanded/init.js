/* global Plugins, __, require, PluginHost */

const _shorten_expanded_threshold = 1.5; //window heights

Plugins.Shorten_Expanded = {
	expand: function(id) {
		const row = $(id);

		if (row) {
			const content = row.select(".content-shrink-wrap")[0];
			const link = row.select(".expand-prompt")[0];

			if (content) content.removeClassName("content-shrink-wrap");
			if (link) Element.hide(link);
		}

		return false;
	}
}

require(['dojo/_base/kernel', 'dojo/ready'], function  (dojo, ready) {
	ready(function() {
		PluginHost.register(PluginHost.HOOK_ARTICLE_RENDERED_CDM, function(row) {
			window.setTimeout(function() {
				if (row) {

					const content = row.querySelector(".content-inner");

					//console.log('shorten', row.offsetHeight, 'vs', _shorten_expanded_threshold * window.innerHeight);

					if (content && row.offsetHeight >= _shorten_expanded_threshold * window.innerHeight) {

						const attachments = row.querySelector(".attachments-inline"); // optional

						content.innerHTML = `
							<div class="content-shrink-wrap">
								${content.innerHTML}
								${attachments ? attachments.innerHTML : ''}
							</div>
							<button dojoType="dijit.form.Button" class="alt-info expand-prompt" onclick="return Plugins.Shorten_Expanded.expand('${row.id}')" href="#">
								${__("Click to expand article")}</button>`;

						if (attachments)
							attachments.innerHTML = "";

						dojo.parser.parse(content);
					}
				}
			}, 150);

			return true;
		});
	});
});
