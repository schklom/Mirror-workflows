const fetch = require("node-fetch").default

function request(url, options = {}, settings = {}) {
	if (settings.statusLine === undefined) settings.statusLine = "OUT"
	if (settings.log === undefined) settings.log = true
	if (settings.log) console.log(`          -> [${settings.statusLine}] ${url}`) // todo: make more like pinski?
	// @ts-ignore
	return fetch(url, Object.assign({
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"
		},
		redirect: "manual"
	}, options))
}

module.exports.request = request
