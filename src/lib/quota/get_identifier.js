const {request} = require("../utils/request")
const {log} = require("pinski/util/common")
const constants = require("../constants.js")
const {createChecker} = require("is-in-subnet")

let addresses = []
let addressSet = new Set()
let subnets = []
let checker = createChecker([])

function getList(url, description) {
	return request(url).text().then(text => {
		// this is decently fast, but if you have ideas for optimisation, please go for it
		let d = Date.now()
		const lines = text.split("\n").filter(l => l && l[0] !== "#")
		subnets = subnets.concat(lines.filter(l => l.includes("/")))
		addresses = addresses.concat(lines.filter(l => !l.includes("/")))
		log(`Loaded ${description} (entries: ${lines.length}) (${Date.now()-d} ms)`, "spam")
	})
}

if (constants.quota.enabled) {
	Promise.all([
		getList("https://check.torproject.org/torbulkexitlist", "Tor exit node list"),
		getList("https://meta.bibliogram.art/quota-list/vpn-ipv4.txt", "VPN IPv4 list"),
		getList("https://meta.bibliogram.art/quota-list/vpn-ipv6.txt", "VPN IPv6 list"),
		getList("https://meta.bibliogram.art/quota-list/known-bots.txt", "Bibliogram known bot list")
	]).then(() => {
		let d = Date.now()
		checker = createChecker(subnets)
		addressSet = new Set(addresses.values())
		log(`Created subnet checker (${Date.now()-d} ms)`, "spam")
	})
}

function getIdentifier(address) {
	try {
		if (address == undefined) return "missing"
		else if (checker(address)) return "proxy"
		else if (addressSet.has(address)) return "proxy"
		else return address
	} catch (e) {
		// not a valid IP address, or some error like that
		console.error(e)
		throw e
	}
}

module.exports.getIdentifier = getIdentifier
