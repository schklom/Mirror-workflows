const fetch = require("node-fetch").default

class NodeFetch {
	constructor(url, options) {
		this.instance = fetch(url, options)
	}

	stream() {
		return this.instance.then(res => res.body)
	}

	response() {
		return this.instance
	}

	json() {
		return this.instance.then(res => res.json())
	}

	text() {
		return this.instance.then(res => res.text())
	}

	async check(test) {
		await this.response().then(res => test(res))
		return this
	}
}

module.exports = NodeFetch
