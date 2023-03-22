const axios = require('axios');
const debug = require('debug')('ap:fetch');
const userAgent = process.env.USER_AGENT || 'Feedropolis RSS Generator';

module.exports = async function(loadParams) {
	debug('fetch '+loadParams.url);
	const params = {
		url: loadParams.url,
		timeout: 10000,
		responseType: 'text',
		maxContentLength: 1024 * 1024,
		validateStatus: () => true, //accept all
		headers: {
			'User-Agent': userAgent
		}
	}
	if (loadParams.body) {
		params.data = loadParams.body;
		params.method = 'POST';
	}
	if (loadParams.headers) {
		Object.assign(params.headers, loadParams.headers);
	}
	if (loadParams.cookies) {
		params.headers.Cookie = loadParams.cookies;
	}
	if (loadParams.referrer) {
		params.headers.Referrer = loadParams.referrer
	}

	const res = await axios(params);
	return res.data;
};
