/**
 * @typedef GrabResponse
 * @property {number} status
 * @property {Map<string, string|string[]} headers
 */

// @ts-nocheck

class GrabReference {
	/**
	 * @param {string} url
	 * @param {any} options
	 */
	constructor(url, options) {
		throw new Error("This is the reference class, do not instantiate it.")
	}

	// Please help me write typings for stream()
	/**
	 * @returns {Promise<any>}
	 */
	stream() {}

	/**
	 * @returns {Promise<GrabResponse>}
	 */
	response() {}

	/**
	 * @returns {Promise<any>}
	 */
	json() {}

	/**
	 * @returns {Promise<string>}
	 */
	text() {}

	/**
	 * @param {(res: GrabResponse) => any}
	 * @returns {Promise<Reference>}
	 */
	check(test) {}
}

module.exports = GrabReference
