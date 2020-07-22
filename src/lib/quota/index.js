const constants = require("../constants")
const LimitByFrame = require("./LimitByFrame")
const {getIdentifier} = require("./get_identifier")
const db = require("../db")
require("../testimports")(LimitByFrame, getIdentifier, db)

const limiter = new LimitByFrame()

function getIPFromReq(req) {
	if (constants.quota.ip_mode === "header") {
		return req.headers[constants.quota.ip_header]
	} else { // constants.quota.ip_mode === "address"
		return req.connection.remoteAddress
	}
}

const preparedTrack = db.prepare("INSERT INTO QuotaHistory VALUES (?, ?, ?)")

function remaining(req) {
	if (!constants.quota.enabled) return Infinity // sure.

	const ip = getIPFromReq(req)
	const identifier = String(getIdentifier(ip))
	const remaining = limiter.remaining(identifier)

	if (constants.quota.track) {
		preparedTrack.run(identifier, Date.now(), remaining)
	}

	return remaining
}

function add(req, count) {
	if (!constants.quota.enabled) return Infinity // why not.

	const ip = getIPFromReq(req)
	const identifier = String(getIdentifier(ip))
	return limiter.add(identifier, count)
}

module.exports.remaining = remaining
module.exports.add = add
