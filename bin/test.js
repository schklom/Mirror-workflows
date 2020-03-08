const nightmare = require('../src/fetcher/nightmare');
const url = process.argv[process.argv.length-1];
nightmare({
	url
}).then(html => console.log('done'));
