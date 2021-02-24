/* global Plugins */

Plugins.NSFW = {
	toggle: function(elem) {
		const content = elem.domNode.parentNode.querySelector(".nswf.content");

		if (content) {
			Element.toggle(content);
		}
	}
}

