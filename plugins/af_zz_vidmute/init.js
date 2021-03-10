/* global require, PluginHost */

require(['dojo/_base/kernel', 'dojo/ready'], function  (dojo, ready) {
	function mute(row) {
		[...row.querySelectorAll("video")].forEach((vid) => { vid.muted = true; });
	}

	ready(function () {
		PluginHost.register(PluginHost.HOOK_ARTICLE_RENDERED_CDM, function (row) {
			mute(row);
			return true;
		});

		PluginHost.register(PluginHost.HOOK_ARTICLE_RENDERED, function (row) {
			mute(row);
			return true;
		});
	});
});
