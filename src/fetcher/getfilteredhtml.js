const cheerio = require('cheerio');
const debug = require('debug')('ap:fetch');
const { URL } = require("url");
const fetch = require('./fetch');
const FS = require('fs/promises');

async function run({
	removeScripts = true,
	removeIframes = true,
	removeLinks = true,
	inlineStylesheets = false,
	inlineScripts = [],
	appendScripts = [],
	input,
	baseUrl
}) {
	const $ = cheerio.load(input);
	$('html').attr('xmlns', null);
	if (removeScripts) $('script').remove();
	if (removeIframes) $('iframe').remove();
	if (removeLinks) $('link').not('[rel=stylesheet]').remove();
	if (inlineStylesheets) {
		let stylesheets = [];
		$('link').each((i, elem) => {
			stylesheets.push( $(elem) );
		});
		for (let stylesheet of stylesheets) {
			let href = stylesheet.attr('href');
			let content = '';
			if (href) {
				// let url = URL.resolve( baseUrl, href );
				let url = new URL(href, baseUrl).href;
				debug('loading stylesheet', url);
				content = await fetch({ url });
			}
			stylesheet.replaceWith(`<style>${content}</style>`);
		}
	}
	appendScripts.forEach(src => {
		$('body').append(`<script src="${src}"></script>`)
	});
	for (let url of inlineScripts) {
		let content;
		if (url.startsWith('http')) {
			content = await fetch({ url });
		} else {
			content = await FS.readFile(url, { encoding: 'utf8' });
		}
		$('body').append(`<script>${content}</script>`)
	}
	return $.html();
}

module.exports = run;
