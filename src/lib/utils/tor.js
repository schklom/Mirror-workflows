const SocksProxyAgent = require("socks-proxy-agent")
const {connect} = require("net");
const constants = require("../constants")
const {request} = require("./request")

class TorManager {
	/**
	 * @param {import("@deadcanaries/granax/lib/controller")} tor
	 * @param {number} port
	 */
	constructor(tor, port) {
		this.tor = tor
		this.port = port
		this.agent = new SocksProxyAgent("socks5://localhost:"+this.port)
	}

	async request(url, test) {
		let result = null
		while (!result) {
			const req = await request(url, {agent: this.agent}, {log: true, statusLine: "TOR"})
			try {
				result = await test(req)
			} catch (e) {
				await this.newCircuit()
			}
		}
		return result
	}

	newCircuit() {
		return new Promise(resolve => {
			this.tor.cleanCircuits(() => resolve())
		})
	}
}

try {
	var granax = require("@deadcanaries/granax")
} catch (e) {}

/** @type {Promise<TorManager>} */
module.exports = new Promise(resolve => {
	if (granax) {
		/** @type {import("@deadcanaries/granax/lib/controller")} */
		// @ts-ignore
		let tor
		if (constants.tor_password == null) {
			// @ts-ignore
			tor = new granax()
		} else {
			tor = new granax.TorController(connect(9051), {authOnConnect: false})
			tor.authenticate(`"${constants.tor_password}"`, err => {
				if (err) console.log("Tor auth error:", err)
			})
		}

		console.log("Starting tor...")

		tor.once("ready", () => {
			tor.getInfo("net/listeners/socks", (err, result) => {
				if (err) throw err
				// result is string containing something like "127.0.0.1:36977"
				// yes, the string contains double quotes!
				const port = +result.match(/:(\d+)/)[1]
				const torManager = new TorManager(tor, port)
				console.log("Tor is ready, using SOCKS port "+port)
				resolve(torManager)
			})
		})

		tor.on("error", function() {
			console.log("Tor error!")
			console.log(...arguments)
		})
	} else {
		console.log("Note: Tor functionality not installed. You may wish to run `npm install @deadcanaries/granax`. (78+ MB download required.)")
		resolve(null)
	}
})
