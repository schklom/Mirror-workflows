import { LRUCache as LRU } from 'lru-cache';
// import Debug from 'debug';
// const debug = Debug('app:login:cookie');

const hotCache = new LRU({
	max: 500,
	ttl: 1000 * 60 * 60 * 12
});

export async function get(key, maxAge, { rolling }) {
	return hotCache.get(key);
}

export async function set(key, sess, maxAge, { rolling, changed }) {
	hotCache.set(key, sess, maxAge);
}

export async function destroy(key) {
	hotCache.delete(key);
}

