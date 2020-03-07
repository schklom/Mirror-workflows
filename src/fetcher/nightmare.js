const Nightmare = require('nightmare')
const nightmare = Nightmare({ show: true })

const url = 'https://www.fn-magazin.de/veranstaltungskalender/';

nightmare
	.goto(url)
	.wait('#dfx-termine')
	.evaluate(() => document.getElementsByTagName('html')[0].innerHTML)
	.end()
	.then(console.log)
	.catch(error => {
		console.error('Search failed:', error)
	})
