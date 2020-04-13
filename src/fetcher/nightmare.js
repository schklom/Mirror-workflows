const Nightmare = require('nightmare')
// require('nightmare-load-filter')(Nightmare)
const userAgent = process.env.USER_AGENT || 'Feedropolis RSS Generator';

module.exports = function({
	waitTime = -1,
	waitForSelector = '',
	url
}) {
	let p = Nightmare({ show: false });
	p = p.useragent(userAgent);
	// p.filter({ urls: [] }, (details, cb) => {
	// 	console.log('~~~URL DETAILS~~~', details);
	// 	return cb({ cancel: false })
	// })
	p = p.goto(url);
	if (waitTime > 0) {
		p = p.wait(waitTime);
	}
	if (waitForSelector) {
		p = p.wait(waitForSelector)
	}
	p = p.evaluate(() => document.getElementsByTagName('html')[0].innerHTML)
		.end()
	return p;
}
