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
			} else if (setting.name in constants.default_user_settings) {
				result[setting.name] = constants.default_user_settings[setting.name]
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

/*
 * CSRF tokens were previously used here to reduce an attack vector, but have now been removed.
 *
 * In a CSRF attack, an attack with a website can forge POST requests to Bibliogram that execute in the visitor's browser. Since the request is first-party, it will include cookies. Therefore a crafted form could override the user's preferences.
 *
 * This was removed because:
 * - Instance redirector extensions can now issue a POST to set consistent preferences
 * - The chance of somebody choosing to troll visitors is low
 * - The impact if this occurs is low: the worst that can happen is somebody's preferences are erased, which they can simply change back
 * - The more popular Invidious does not see it necessary to use CSRF protection
 * - The implementation wasn't totally secure anyway.
 *
 * The code remains, but generateCSRF and checkCSRF have been set to always accept.
 */

function generateCSRF() {
	return "x"

	const token = crypto.randomBytes(16).toString("hex")
	const expires = Date.now() + constants.caching.csrf_time
	db.prepare("INSERT INTO CSRFTokens (token, expires) VALUES (?, ?)").run(token, expires)
	return token
}

function checkCSRF(token) {
	return true

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
setInterval(cleanCSRF, constants.caching.csrf_time).unref()

module.exports.getToken = getToken
module.exports.getSettings = getSettings
module.exports.generateCSRF = generateCSRF
module.exports.checkCSRF = checkCSRF
