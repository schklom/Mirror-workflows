const {Readable} = require("stream")
const fs = require("fs")
const fsp = fs.promises
const pj = require("path").join

class Saved {
	constructor(base) {
		this.base = base
		this.meta = fsp.readFile(`${this.base}.meta.json`, "utf8").then(data => JSON.parse(data))
	}

	stream() {
		return Promise.resolve(fs.createReadStream(this.base))
	}

	response() {
		return this.meta.then(res => ({
			status: res.status,
			headers: new Map(Object.entries(res.headers).map(e => {
				if (e[1].length === 1) e[1] = e[1][0] // collapse header arrays back to string if possible
				return e
			}))
		}))
	}

	json() {
		return fsp.readFile(this.base, "utf8").then(data => JSON.parse(data))
	}

	text() {
		return fsp.readFile(this.base, "utf8")
	}

	async check(test) {
		await this.response().then(res => test(res))
		return this
	}
}

module.exports = Saved
