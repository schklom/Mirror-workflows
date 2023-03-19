const { DOMParser } = require('xmldom')
const select = require('xpath.js')
const nightmareFetcher = require('./nightmare');
const simpleFetcher = require('./fetch');
const { Feed } = require('feed');
const debug = require('debug')('ap:feed');
const url = require('url');
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
		let v = {
			link: new URL(entry.link, new URL(siteData.url)).href,
			title: entry.title.trim(),
			description: entry.description ? entry.description.trim() : '',
			image: entry.image ? entry.image.trim() : '',
			added: new Date()
		}
		if (v.link.length > 255) {
			debug('link too long to save', link);
			return null;
		}
		if (v.title.length > 255) {
			v.title = v.title.substring(0, 255);
		}
		if (v.description.length > 255) {
			v.description = v.description.substring(0, 255);
		}
		if (v.image.length > 255) {
			v.image = '';
		}
		return v;
	}).filter(e => !!e)
}

function getDom(html) {
	debug('html', html);
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
		let title = getValue(titleElem);
		if (!title) {
			debug('no title found', titleElem);
			return;
		}
		let linkElem = select(entry, settings.pathLink);
		let link = getValue(linkElem);
		if (!link) {
			debug('no link found', linkElem);
			return;
		}
		let description;
		if (settings.pathDescription) {
			let descriptionElem = select(entry, settings.pathDescription);
			description = getValue(descriptionElem);
		}
		let image;
		if (settings.pathImage) {
			let imageElem = select(entry, settings.pathImage);
			image = getValue(imageElem);
		}
		data.push({
			title,
			link,
			image,
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

const baseUrl = process.env.BASE_URL || 'http://localhost';

function createFeed(settings, feedData) {
	let favUrl = new URL(settings.url);
	favUrl.pathname = '/favicon.ico';
	favUrl.search = '';
	const feed = new Feed({
		title: settings.title || 'unnamed',
		description: settings.description || 'no description',
		id: settings.url, //crypto.createHash('sha1').update(settings.url).digest('hex'),
		link: encodeURIComponent(settings.url),
		favicon: favUrl.href,
		generator: 'FeedroPolis',
		feedLinks: {
			atom: new URL(`/feed/get/${settings.uid || 0}/${settings.secret || 'none'}/`, new URL(baseUrl)).href
		}
	});
	feedData.forEach(({ title, link, description, added, image }) => {
		const item = {
			id: link,
			title,
			link,
			description,
			content: '',
			date: added
		};
		item.content += '<h1>'+title+'</h1>';
		if (description) item.content += '<p>'+description+'</p>';
		if (image) item.content += '<img src="'+image+'" />'
		feed.addItem(item);
	});
	return feed;
}

module.exports = {
	generateFeedFromSettings,
	getHtml,
	getDom,
	extractDataXpath,
	extractSitedata,
	createFeed
}
