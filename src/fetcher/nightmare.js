const { default: emere } = require('@stormking/emere')
// require('nightmare-load-filter')(Nightmare)
const userAgent = process.env.USER_AGENT || 'Feedropolis RSS Generator';

module.exports = function(loadParams) {
	const headers = { ...(loadParams.headers || {}) };
	if (loadParams.cookies) {
		headers.Cookie = loadParams.cookies;
	}
	const params = {
		url: loadParams.url,
		header: headers,
		waitAfterLoad: waitTime > 0 ? waitTime : 0,
		waitForSelector,
		userAgent,
		referrer: loadParams.referrer,
		timeout: 10000
	};
	if (loadParams.body) {
		params.body = loadParams.body;
		params.method = 'POST';
	}
	return emere(params)
}
