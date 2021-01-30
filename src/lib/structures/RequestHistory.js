const constants = require("../constants")
const db = require("../db")

class RequestHistory {
	/**
	 * @param {string[]} tracked list of things that can be tracked
	 */
	constructor(tracked) {
		this.tracked = new Set(tracked)
		/** @type {Map<string, {lastRequestAt: number | null, lastRequestSuccessful: boolean | null, kind?: any}>} */
		this.store = new Map()
		for (const key of tracked) {
			this.store.set(key, {
				lastRequestAt: null,
				lastRequestSuccessful: null
			})
		}
	}

	/**
	 * @param {string} key
	 * @param {boolean} success
	 * @param {any} [kind]
	 */
	report(key, success, kind) {
		if (!this.tracked.has(key)) throw new Error(`Trying to report key ${key}, but is not tracked`)
		const entry = this.store.get(key)
		entry.lastRequestAt = Date.now()
		entry.lastRequestSuccessful = success
		entry.kind = kind
		if (constants.caching.db_request_history) {
			db.prepare("INSERT INTO RequestHistory (type, success, timestamp) VALUES (?, ?, ?)").run(key, +entry.lastRequestSuccessful, entry.lastRequestAt)
		}
	}

	export() {
		const result = {}
		for (const key of this.store.keys()) {
			result[key] = this.store.get(key)
		}
		return result
	}

	testNoneBlocked() {
		for (const value of this.store.values()) {
			if (value.lastRequestSuccessful === false) return false
		}
		return true
	}
}

module.exports = RequestHistory
