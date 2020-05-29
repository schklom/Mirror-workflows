function getSettingsReferrer(current, settingsURL = "/settings") {
	if (!current) return settingsURL
	const params = new URLSearchParams()
	params.append("referrer", current)
	return settingsURL + "?" + params.toString()
}

module.exports.getSettingsReferrer = getSettingsReferrer
