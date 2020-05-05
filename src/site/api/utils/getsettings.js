const {parse} = require("cookie")

const constants = require("../../../lib/constants")
const db = require("../../../lib/db")

function addDefaults(input = {}) {
	const result = {}
	for (const setting of constants.user_settings) {
		if (input[setting.name] !== undefined) {
			result[setting.name] = input[setting.name]
		} else {
			result[setting.name] = setting.default
		}
	}
	return result
}

function getSettings(req) {
	if (!req.headers.cookie) return addDefaults()
	const cookie = parse(req.headers.cookie)
	const settings = cookie.settings
	if (!settings) return addDefaults()
	const row = db.prepare("SELECT * FROM UserSettings WHERE token = ?").get(settings)
	if (!row) return addDefaults()
	return addDefaults(row)
}

module.exports.getSettings = getSettings
