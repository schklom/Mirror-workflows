const constants = require("../constants")
const {Parser} = require("./parser/parser")

function tryMatch(text, against, callback) {
	let matched = text.match(against)
	if (matched) callback(matched)
}

function textToParts(text) {
	return [{type: "text", text: text}]
}

function replacePart(parts, index, match, replacements) {
	const toReplace = parts.splice(index, 1)[0]
	const before = toReplace.text.slice(0, match.index)
	const after = toReplace.text.slice(match.index + match[0].length)
	parts.splice(index, 0, ...textToParts(before), ...replacements, ...textToParts(after))
}

function partsUsername(parts) {
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].type === "text") {
			tryMatch(parts[i].text, `@(${constants.external.username_regex})`, match => {
				replacePart(parts, i, match, [
					{type: "user", text: match[0], user: match[1]}
				])
				i += 1 // skip parts: user
			})
		}
	}
}

function partsHashtag(parts) {
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].type === "text") {
			tryMatch(parts[i].text, `#(${constants.external.hashtag_regex})`, match => {
				replacePart(parts, i, match, [
					{type: "hashtag", text: match[0], hashtag: match[1]}
				])
				i += 1 // skip parts: hashtag
			})
		}
	}
}

function structure(text) {
	const parts = textToParts(text)
	partsUsername(parts)
	partsHashtag(parts)
	return parts
}

module.exports.structure = structure
