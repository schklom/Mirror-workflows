const constants = require("../constants")
const {Parser} = require("./parser/parser")

/**
 * @param {string} text
 * @returns {{status: symbol, value: any}}
 */
function extractSharedData(text) {
	const parser = new Parser(text)
	const index = parser.seek("window._sharedData = ", {moveToMatch: true, useEnd: true})
	if (index === -1) {
		// Maybe the profile is age restricted?
		const age = getRestrictedAge(text)
		if (age !== null) { // Correct.
			return {status: constants.symbols.extractor_results.AGE_RESTRICTED, value: age}
		}
		return {status: constants.symbols.extractor_results.NO_SHARED_DATA, value: null}
	}
	parser.store()
	const end = parser.seek(";</script>")
	parser.restore()
	const sharedDataString = parser.slice(end - parser.cursor)
	const sharedData = JSON.parse(sharedDataString)
	// check for alternate form of age restrictions
	if (sharedData.entry_data && sharedData.entry_data.HttpGatedContentPage) {
		// lazy fix; ideally extracting the age should be done here, but for the web ui it doesn't matter
		return {status: constants.symbols.extractor_results.AGE_RESTRICTED, value: null}
	}
	return {status: constants.symbols.extractor_results.SUCCESS, value: sharedData}
}

/**
 * @param {string} text
 */
function getRestrictedAge(text) {
	const parser = new Parser(text)
	let index = parser.seek("<h2>Restricted profile</h2>", {moveToMatch: true, useEnd: true})
	if (index === -1) return null
	index = parser.seek("<p>", {moveToMatch: true, useEnd: true})
	if (index === -1) return null
	const explanation = parser.get({split: "</p>"}).trim()
	const match = explanation.match(/You must be (\d+?) years? old or over to see this profile/)
	if (!match) return null
	return +match[1] // the age
}

module.exports.extractSharedData = extractSharedData
