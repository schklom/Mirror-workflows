const getFilteredHtml = require('../../fetcher/getfilteredhtml');
const { generateFeedFromSettings, getHtml } = require('../../fetcher/feed');

const methods = {};
const controller = {};


controller['POST /load-page'] = async (data, ctx) => {
	ctx.session.url = data.url;
	ctx.session.loadParams = data;
	let html = await getHtml(data);
	html = await getFilteredHtml({
		input: html,
		baseUrl: data.url,
		inlineStylesheets: true,
		appendScripts: [ '/inner.js' ]
	});
	ctx.session.loadedPage = html;
	return { ok: true, length: html.length }
}

controller['POST /set-selectors'] = async (data, ctx) => {
	ctx.session.selectors = data;
	let settings = Object.assign({}, ctx.session.loadParams);
	settings = Object.assign(settings, ctx.session.selectors);
	let feed = await generateFeedFromSettings(settings);
	ctx.session.generated = feed.atom1();
	return { ok: true }
}

methods.controller = controller;

module.exports = methods;
