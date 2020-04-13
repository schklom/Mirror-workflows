const { fetchUrl } = require('fetch');
const debug = require('debug')('ap:fetch');
const userAgent = process.env.USER_AGENT || 'Feedropolis RSS Generator';

module.exports = function(url) {
	debug('fetch '+url);
	const options = { headers: {} };
	options.headers['User-Agent'] = userAgent;
	return new Promise(function(resolve) {
		fetchUrl(url, {}, (err, meta, body) => {
			resolve(body ? body.toString('utf8') : '');
		});
	});
};
