const { default: emere } = require('@stormking/emere')
// require('nightmare-load-filter')(Nightmare)
const userAgent = process.env.USER_AGENT || 'Feedropolis RSS Generator';

module.exports = function({
	waitTime = 0,
	waitForSelector = '',
	url,
	cookies = ''
}) {
	const headers = {};
	if (cookies) {
		headers.Cookie = cookies;
	}
	return emere({
		url,
		headers,
		waitAfterLoad: waitTime > 0 ? waitTime : 0,
		waitForSelector,
		userAgent,
		timeout: 10000
	})
}
