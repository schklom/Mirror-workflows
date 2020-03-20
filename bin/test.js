const { getDom, extractDataSelect, extractDataXpath } = require('../src/fetcher/feed')
const FS = require('fs').promises;
const debug = require('debug')('ap');

async function run() {
	let html = await FS.readFile('./data/yt.html', { encoding: 'utf8' });
	let dom = await getDom(html);
	debug('dom', dom);
	// return;
	let data = extractDataXpath(dom, {
		// entry: '.content',
		// title: {
		// 	path: 'h3',
		// 	text: true
		// },
		// link: {
		// 	path: 'a',
		// 	attr: 'href'
		// },
		// description: {
		// 	path: 'p',
		// 	text: true
		// },
		pathTitle: './h2/text()',
		pathLink: './h2/a/ancestor-or-self::node()/@href',
		pathDescription: './p/text()',
		pathEntry: '/HTML/BODY/DIV/DIV/DIV'.toLowerCase()
	})
	debug('data', data);
}

run()
	.catch(e => {
		console.log(e)
		process.exit(1)
	})
