const cheerio = require('cheerio');
const { fetchUrl } = require('fetch');
const debug = require('debug')('ap:fetch');
const URL = require("url");

async function fetch(url) {
	debug('fetch '+url);
	return new Promise(function(resolve) {
		fetchUrl(url, {}, (err, meta, body) => {
			resolve(body ? body.toString('utf8') : '');
		});
	});
}

async function run({
	removeScripts = true,
	removeIframes = true,
	removeLinks = true,
	inlineStylesheets = false,
	appendScripts = [],
	input,
	baseUrl
}) {
	const $ = cheerio.load(input);
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
				let url = URL.resolve( baseUrl, href );
				debug('loading stylesheet', url);
				content = await fetch(url);
			}
			stylesheet.replaceWith(`<style>${content}</style>`);
		}
	}
	appendScripts.forEach(src => {
		$('body').append(`<script src="${src}"></script>`)
	})

	let output = $.html();
	// output = `${output}\n`
	return output;
}

module.exports = run;
