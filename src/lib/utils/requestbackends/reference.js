/**
 * @typedef GrabResponse
 * @property {number} status
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

	// Please help me type this
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
