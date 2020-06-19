const crypto = require("crypto")
const {parse: parseCookie} = require("cookie")

const constants = require("../../../lib/constants")
const db = require("../../../lib/db")

function addDefaults(input = {}) {
	const result = {}
	for (const setting of constants.user_settings) {
		if (input[setting.name] !== undefined) {
			result[setting.name] = input[setting.name]
		} else {
			if (setting.boolean) {
				result[setting.name] = +(setting.default !== "")
			} else {
				result[setting.name] = setting.default
			}
		}
	}
	return result
}

function getToken(req) {
	if (!req.headers.cookie) return null
	const cookie = parseCookie(req.headers.cookie)
	const token = cookie.settings
	if (token) return token
	else return null
}

function getSettings(req) {
	const token = getToken(req)
	if (token) {
		const row = db.prepare("SELECT * FROM UserSettings WHERE token = ?").get(token)
		if (row) {
			return addDefaults(row)
		}
	}
	return addDefaults()
}

function generateCSRF() {
	const token = crypto.randomBytes(16).toString("hex")
	const expires = Date.now() + constants.caching.csrf_time
	db.prepare("INSERT INTO CSRFTokens (token, expires) VALUES (?, ?)").run(token, expires)
	return token
}

function checkCSRF(token) {
	const row = db.prepare("SELECT * FROM CSRFTokens WHERE token = ? AND expires > ?").get(token, Date.now())
	if (row) {
		db.prepare("DELETE FROM CSRFTokens WHERE token = ?").run(token)
		return true
	} else {
		return false
	}
}

function cleanCSRF() {
	db.prepare("DELETE FROM CSRFTokens WHERE expires <= ?").run(Date.now())
}
cleanCSRF()
setInterval(cleanCSRF, constants.caching.csrf_time)

module.exports.getToken = getToken
module.exports.getSettings = getSettings
module.exports.generateCSRF = generateCSRF
module.exports.checkCSRF = checkCSRF
