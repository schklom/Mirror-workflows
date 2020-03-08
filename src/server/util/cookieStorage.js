
const LRU = require('lru-cache');
const debug = require('debug')('app:login:cookie');

const hotCache = new LRU({
	max: 500,
	maxAge: 1000 * 60 * 60 * 12
});

async function get(key, maxAge, { rolling }) {
	return hotCache.get(key);
}

async function set(key, sess, maxAge, { rolling, changed }) {
	hotCache.set(key, sess, maxAge);
}

async function destroy(key) {
	hotCache.del(key);
}

module.exports = {
	get,
	set,
	destroy
}
