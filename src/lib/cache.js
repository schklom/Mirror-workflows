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

	hasNotPromise(key) {
		const has = this.has(key)
		if (!has) return false
		const value = this.get(key)
		if (value instanceof Promise || (value.constructor && value.constructor.name === "Promise")) return false
		return true
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
			return Math.max(Math.ceil((this.cache.get(key).time + this.ttl - Date.now()) / factor), 0)
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

/**
 * @extends TtlCache<T>
 * @template T
 */
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
	 */
	getOrFetchPromise(key, callback) {
		return this.getOrFetch(key, callback).then(result => {
			this.cache.delete(key)
			return result
		})
	}
}

/**
 * @template T
 */
class UserRequestCache extends TtlCache {
	constructor(ttl) {
		super(ttl)
		/** @type {Map<string, {data: T, isReel: boolean, isFailedPromise: boolean, htmlFailed: boolean, time: number}>} */
		this.cache
	}

	/**
	 * @param {string} key
	 * @param {boolean} isReel
	 * @param {any} [data]
	 */
	set(key, isReel, data) {
		const existing = this.cache.get(key)
		// Preserve html failure status if now requesting as reel
		const htmlFailed = isReel && existing && existing.htmlFailed
		this.cache.set(key, {data, isReel, isFailedPromise: false, htmlFailed, time: Date.now()})
	}

	/**
	 * @param {string} key
	 * @param {boolean} isHtmlPreferred
	 * @param {boolean} willFetchReel
	 * @param {() => Promise<T>} callback
	 * @returns {Promise<T>}
	 */
	getOrFetch(key, willFetchReel, isHtmlPreferred, callback) {
		this.cleanKey(key)
		if (this.cache.has(key)) {
			const existing = this.cache.get(key)
			if ((!existing.isReel || !isHtmlPreferred || existing.htmlFailed) && !existing.isFailedPromise) return Promise.resolve(existing.data)
		}
		const pending = callback().then(result => {
			if (this.getWithoutClean(key) === pending) { // if nothing has replaced the current cache in the meantime
				this.set(key, willFetchReel, result)
			}
			return result
		}).catch(error => {
			this.cache.get(key).htmlFailed = true
			this.cache.get(key).isFailedPromise = true
			throw error
		})
		this.set(key, willFetchReel, pending)
		return pending
	}
}

module.exports.TtlCache = TtlCache
module.exports.RequestCache = RequestCache
module.exports.UserRequestCache = UserRequestCache
