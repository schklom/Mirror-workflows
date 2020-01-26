/**
 * @template T
 */
class TtlCache {
	/**
	 * @param {number} ttl time to keep each resource in milliseconds
	 */
	constructor(ttl) {
		this.ttl = ttl
		/** @type {Map<string, {data: T, time: number}>} */
		this.cache = new Map()
	}

	clean() {
		for (const key of this.cache.keys()) {
			this.cleanKey(key)
		}
	}

	cleanKey(key) {
		const value = this.cache.get(key)
		if (value && Date.now() > value.time + this.ttl) this.cache.delete(key)
	}

	/**
	 * @param {string} key
	 */
	has(key) {
		this.cleanKey(key)
		return this.hasWithoutClean(key)
	}

	hasWithoutClean(key) {
		return this.cache.has(key)
	}

	/**
	 * @param {string} key
	 */
	get(key) {
		this.cleanKey(key)
		return this.getWithoutClean(key)
	}

	getWithoutClean(key) {
		const value = this.cache.get(key)
		if (value) return value.data
		else return null
	}

	/**
	 * Returns null if doesn't exist
	 * @param {string} key
	 * @param {number} factor factor to divide the result by. use 60*1000 to get the ttl in minutes.
	 */
	getTtl(key, factor = 1) {
		if (this.has(key)) {
			return Math.max((Math.floor(Date.now() - this.cache.get(key).time) / factor), 0)
		} else {
			return null
		}
	}

	/**
	 * @param {string} key
	 * @param {any} data
	 */
	set(key, data) {
		this.cache.set(key, {data, time: Date.now()})
	}

	/**
	 * @param {string} key
	 */
	refresh(key) {
		this.cache.get(key).time = Date.now()
	}
}

class RequestCache extends TtlCache {
	/**
	 * @param {number} ttl time to keep each resource in milliseconds
	 */
	constructor(ttl) {
		super(ttl)
	}

	/**
	 * @param {string} key
	 * @param {() => Promise<T>} callback
	 * @returns {Promise<T>}
	 * @template T
	 */
	getOrFetch(key, callback) {
		this.cleanKey(key)
		if (this.cache.has(key)) return Promise.resolve(this.get(key))
		else {
			const pending = callback().then(result => {
				this.set(key, result)
				return result
			})
			this.set(key, pending)
			return pending
		}
	}

	/**
	 * @param {string} key
	 * @param {() => Promise<T>} callback
	 * @returns {Promise<T>}
	 * @template T
	 */
	getOrFetchPromise(key, callback) {
		return this.getOrFetch(key, callback).then(result => {
			this.cache.delete(key)
			return result
		})
	}
}

module.exports.TtlCache = TtlCache
module.exports.RequestCache = RequestCache
