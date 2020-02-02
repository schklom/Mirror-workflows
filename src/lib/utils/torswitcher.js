const constants = require("../constants")
const {request} = require("./request")

class TorSwitcher {
	constructor() {
		this.torManager = null
	}

	setManager(torManager) {
		this.torManager = torManager
	}

	canUseTor() {
		return !!this.torManager
	}

	/**
	 * Request from the URL.
	 * The test function will be called with the response object.
	 * If the test function succeeds, its return value will be returned here.
	 * If the test function fails, its error will be rejected here.
	 * Only include rate limit logic in the test function!
	 * @param {string} url
	 * @param {(res: import("node-fetch").Response) => Promise<T>} test
	 * @returns {Promise<T>}
	 * @template T the return value of the test function
	 */
	request(type, url, test) {
		if (this.torManager && constants.tor.for[type]) {
			return this.torManager.request(url, test)
		} else {
			return request(url).then(res => test(res))
		}
	}
}

const switcher = new TorSwitcher()

if (constants.tor.enabled) {
	require("./tor").then(torManager => {
		if (torManager) switcher.setManager(torManager)
	})
}

module.exports = switcher
