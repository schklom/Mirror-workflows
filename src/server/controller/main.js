const nightmareFetcher = require('../../fetcher/nightmare');
const simpleFetcher = require('../../fetcher/fetch');
const getFilteredHtml = require('../../fetcher/getfilteredhtml');

const methods = {};
const controller = {};

controller['POST /test'] = async (data) => {
	return data;
}

controller['POST /load-page'] = async (data, ctx) => {
	ctx.session.url = data.url;
	let html;
	if (data.loadScripts) {
		let params = {
			url: data.url
		};
		if (data.waitFor === 'time') {
			params.waitTime = ~~(data.waitForTime);
		} else if (data.waitFor === 'selector') {
			params.waitForSelector = data.waitForSelector;
		}
		html = await nightmareFetcher(params);
	} else {
		html = await simpleFetcher(data.url);
	}
	html = await getFilteredHtml({
		input: html,
		baseUrl: data.url,
		inlineStylesheets: true,
		appendScripts: [ '/inner.js' ]
	});
	ctx.session.loadedPage = html;
	return { ok: true, length: html.length }
}

methods.controller = controller;

module.exports = methods;
