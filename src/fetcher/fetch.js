const { fetchUrl } = require('fetch');
const debug = require('debug')('ap:fetch');
const userAgent = process.env.USER_AGENT || 'Feedropolis RSS Generator';

module.exports = function(url, cookies) {
	debug('fetch '+url);
	const options = { headers: {} };
	if (cookies) options.cookies = cookies.split(';');
	options.headers['User-Agent'] = userAgent;
	return new Promise(function(resolve) {
		fetchUrl(url, options, (err, meta, body) => {
			resolve(body ? body.toString('utf8') : '');
		});
	});
};
