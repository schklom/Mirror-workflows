/* global Plugins */

Plugins.NSFW = {
	toggle: function(elem) {
		elem = elem.domNode || elem;

		const content = elem.closest(".nsfw-wrapper").querySelector('.nsfw-content');

		// we can't use .toggle() here because this script could be invoked by the api client
		// so it's back to vanilla js

		if (content.style.display == 'none')
			content.style.display = '';
		else
			content.style.display = 'none';
	}
}

