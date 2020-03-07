const FS = require('fs').promises;
const cheerio = require('cheerio');
const { fetchUrl } = require('fetch');
const debug = require('debug')('filter');

async function fetch(url) {
	debug('fetch '+url);
	return new Promise(function(resolve) {
		fetchUrl(url, {}, (err, meta, body) => {
			resolve(body ? body.toString('utf8') : '');
		});
	});
}

async function run() {
	let base = await FS.readFile('./data/fn.html');
	const $ = cheerio.load(base);
	$('script').remove();
	$('iframe').remove();
	$('link').not('[rel=stylesheet]').remove();
	let stylesheets = [];
	$('link').each((i, elem) => {
		stylesheets.push( $(elem) );
	});
	for (let stylesheet of stylesheets) {
		let href = stylesheet.attr('href');
		let content = '';
		if (href) {
			// console.log(href);
			content = await fetch(href);
		} else {
			// console.log(stylesheet);
		}
		stylesheet.replaceWith(`<style>${content}</style>`);
	}
	$('body').append('<script src="/inner.js"></script>')
	let output = $.html();
	// output = `${output}\n`
	console.log(output);
}

run();
