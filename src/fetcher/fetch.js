const { fetchUrl } = require('fetch');
const debug = require('debug')('ap:fetch');


module.exports = function(url) {
	debug('fetch '+url);
	return new Promise(function(resolve) {
		fetchUrl(url, {}, (err, meta, body) => {
			resolve(body ? body.toString('utf8') : '');
		});
	});
};
