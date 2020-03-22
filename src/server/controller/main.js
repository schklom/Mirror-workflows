const getFilteredHtml = require('../../fetcher/getfilteredhtml');
const { generateFeedFromSettings, getHtml, getDom, extractSitedata } = require('../../fetcher/feed');
const URL = require('url');
const { XMLSerializer } = require('xmldom');

const methods = {};
const controller = {};

const baseUrl = process.env.BASE_URL || 'http://localhost';
const injectHref = URL.resolve( baseUrl, '/inner.js' );

controller['POST /load-page'] = async (data, ctx) => {
	ctx.session.url = data.url;
	ctx.session.loadParams = data;
	let html = await getHtml(data);
	html = await getFilteredHtml({
		input: html,
		baseUrl: data.url,
		inlineStylesheets: true,
		appendScripts: [ injectHref ]
	});
	let dom = getDom(html);
	let siteData = extractSitedata(dom, html, { url: data.url });
	html = new XMLSerializer().serializeToString(dom);
	ctx.session.loadedPage = html;
	return { ok: true, length: html.length, title: siteData.title, description: siteData.description  }
}

controller['POST /set-selectors'] = async (data, ctx) => {
	ctx.session.selectors = data;
	let settings = Object.assign({}, ctx.session.loadParams);
	settings.selectors = ctx.session.selectors;
	let feed = await generateFeedFromSettings(settings);
	ctx.session.generated = feed.atom1();
	return { ok: true }
}

methods.controller = controller;

module.exports = methods;
