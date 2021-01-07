const feed = require('feed');
const { DOMParser } = require('xmldom')
const select = require('xpath.js')
const nightmareFetcher = require('./nightmare');
const simpleFetcher = require('./fetch');
const { Feed } = require('feed');
const debug = require('debug')('ap:feed');
const cheerio = require('cheerio');
const url = require('url');
const crypto = require('crypto');
const getFilteredHtml = require('./getfilteredhtml');

async function generateFeedFromSettings(settings) {
	debug('generateFeedFromSettings', settings);
	let html = await getHtml(settings);
	html = await getFilteredHtml({ input: html });
	debug('html filtered size', html.length);
	let doc = await getDom(html);
	// debug('dom', doc);
	let feedData = extractDataXpath(doc, settings.selectors);
	debug('feedData', feedData);
	let siteData = extractSitedata(doc, html, settings);
	feedData = sanitizeFeedData(feedData, siteData);
	let feed = createFeed(settings, feedData, siteData);
	debug('feed', feed);
	return feed;
}

function extractSitedata(doc, html, settings) {
	let res = {
		title: '',
		description: '',
		url: settings.url
	};

	let titleElem = select(doc, '//title/text()');
	if (!titleElem.length) titleElem = select(doc, '//h1/text()');
	if (titleElem.length) res.title = titleElem[0].data.trim();

	let descElem = select(doc, '//meta[@name="description"]/@content')
	if (descElem.length) res.description = descElem[0].value.trim();

	if (!res.title) {
		let u = new URL(settings.url);
		res.title = u.hostname;
	}

	return res;
}

function sanitizeFeedData(feedData, siteData) {
	return feedData.map(entry => {
		return {
			link: url.resolve( siteData.url, entry.link ),
			title: entry.title.trim(),
			description: entry.description ? entry.description.trim() : '',
			added: new Date()
		}
	})
}

function getDom(html) {
	return new DOMParser({
		errorHandler: {
			warning(w) {
				debug('xml-warning', w);
			},
			error(e) {
				debug('xml-error', e);
			},
			fatalError(e) {
				throw new Error(e)
			}
		}
	}).parseFromString(html, 'text/html');
}
function getDomCheerio(html) {
	return cheerio.load(html);
}

async function getHtml(settings) {
	let html;
	if (settings.loadScripts) {
		let params = {
			url: settings.url
		};
		if (settings.cookies) {
			params.cookies = settings.cookies;
		}
		if (settings.waitFor === 'time') {
			params.waitTime = ~~(settings.waitForTime);
		} else if (settings.waitFor === 'selector') {
			params.waitForSelector = settings.waitForSelector;
		}
		html = await nightmareFetcher(params);
	} else {
		html = await simpleFetcher(settings.url, settings.cookies);
	}
	return html;
}

function extractDataXpath(doc, settings) {
	let data = [];
	let entries = select(doc, settings.pathEntry);
	debug('entries', entries.length);
	entries.forEach(entry => {
		// debug('entry', entry);
		let titleElem = select(entry, settings.pathTitle);
		let title = getValue(titleElem); //titleElem.length ? titleElem[0].data : null;
		if (!title) {
			debug('no title found', titleElem);
			return;
		}
		let linkElem = select(entry, settings.pathLink);
		let link = getValue(linkElem); //.length ? linkElem[0].value : null;
		if (!link) {
			debug('no link found', linkElem);
			return;
		}
		let description;
		if (settings.pathDescription) {
			let descriptionElem = select(entry, settings.pathDescription);
			description = getValue(descriptionElem); //.length ? descriptionElem[0].data : null;
		}
		data.push({
			title,
			link,
			description
		});
	});
	function getValue(e) {
		if (e.length === 0) return null;
		if (e[0].value) return e[0].value;
		if (e[0].data) return e[0].data;
		return null;
	}
	return data;
}
function extractDataSelect($, settings) {
	const data = [];
	$(settings.entry).each((i, e) => {
		const $e = $(e);
		let title = getValue($e, settings.title);
		if (!title) {
			debug('no title found', $e);
			return;
		}
		let link = getValue($e, settings.link);
		if (!link) {
			debug('no link found', $e);
			return;
		}
		let description = getValue($e, settings.description);
		if (!link) {
			debug('no description found', $e);
		}
		data.push({
			title,
			link,
			description
		})
	});
	function getValue($e, config) {
		$e = $e.find(config.path);
		if (config.text) return $e.text();
		if (config.attr) return $e.attr(config.attr);
	}
	return data;
}

function r2a(res) {
	let a = [];
	let elem;
	while (elem = res.iterateNext()) {
		a.push(elem);
	}
	return a;
}

const baseUrl = process.env.BASE_URL || 'http://localhost';

function createFeed(settings, feedData) {
	const feed = new Feed({
		title: settings.title || 'unnamed',
		description: settings.description || 'no description',
		id: settings.url, //crypto.createHash('sha1').update(settings.url).digest('hex'),
		link: encodeURIComponent(settings.url),
		generator: 'FeedroPolis',
		feedLinks: {
			atom: url.resolve(baseUrl, `/feed/get/${settings.uid || 0}/${settings.secret || 'none'}/`)
		}
	});
	feedData.forEach(({ title, link, description, added }) => {
		feed.addItem({
			id: link, //crypto.createHash('sha1').update(link).digest('hex'),
			title,
			link,
			description,
			date: added
		});
	});
	return feed;
}

module.exports = {
	generateFeedFromSettings,
	getHtml,
	getDom,
	extractDataXpath,
	extractDataSelect,
	extractSitedata,
	createFeed
}
