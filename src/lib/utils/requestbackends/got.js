try {
	var got = require("got").default
} catch (e) {}

class Got {
	constructor(url, options, stream) {
		if (!got) throw new Error("`got` is not installed, either install it or set a different request backend.")
		this.url = url
		this.options = options
	}

	stream() {
		return Promise.resolve(got.stream(this.url, this.options))
	}

	send() {
		if (!this.instance) {
			this.instance = got(this.url, this.options)
		}
		return this
	}

	/**
	 * @returns {Promise<import("./reference").GrabResponse>}
	 */
	response() {
		return this.send().instance.then(res => ({
			status: res.statusCode
		}))
	}

	async check(test) {
		await this.send().response().then(res => test(res))
		return this
	}

	json() {
		return this.send().instance.json()
	}

	text() {
		return this.send().instance.text()
	}
}

module.exports = Got
