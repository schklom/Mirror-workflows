const NodeFetch = require("./request_backends/node-fetch")
const Got = require("./request_backends/got")

const constants = require("../constants")

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"

const backendStatusLineMap = new Map([
	["node-fetch", "NF "],
	["got", "GOT"]
])

/**
 * @returns {import("./request_backends/reference")}
 */
function request(url, options = {}, settings = {}) {
	if (settings.statusLine === undefined) settings.statusLine = "OUT"
	if (settings.log === undefined) settings.log = true
	if (settings.log) console.log(`      -> [${settings.statusLine}-${backendStatusLineMap.get(constants.request_backend)}] ${url}`) // todo: make more like pinski?
	if (constants.request_backend === "node-fetch") {
		return new NodeFetch(url, Object.assign({
			headers: {
				"User-Agent": userAgent
			},
			redirect: "manual"
		}, options))
	} else if (constants.request_backend === "got") {
		return new Got(url, Object.assign({
			headers: {
				"User-Agent": userAgent
			},
			followRedirect: false,
			throwHttpErrors: false
		}, options))
	} else {
		throw new Error("Invalid value for setting `request_backend`.")
	}
}

module.exports.request = request
