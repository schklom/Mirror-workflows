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
	 * @param {(res: import("./requestbackends/reference").GrabResponse) => any} test
	 * @returns {Promise<import("./requestbackends/reference")>}
	 */
	request(type, url, test) {
		if (this.torManager && constants.tor.for[type]) {
			return this.torManager.request(url, test)
		} else {
			return request(url).check(test)
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
