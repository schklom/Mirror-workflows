const constants = require("../constants")

function tryMatch(text, against, callback) {
	if (against instanceof RegExp && against.global) {
		// if it's a global match, keep sending matches to the callback while the callback returns true
		let matched
		let ok = true
		while (ok && (matched = against.exec(text))) {
			ok = callback(matched)
		}
		against.lastIndex = 0
	} else {
		// if it's a non-global match, just do the match.
		let matched = text.match(against)
		if (matched) callback(matched)
	}
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
			tryMatch(parts[i].text, new RegExp(`@(${constants.external.username_regex})`, "g"), match => {
				if (match.index === 0 || parts[i].text[match.index-1].match(/\W/)) { // check that there isn't a word directly before the username
					replacePart(parts, i, match, [
						{type: "user", text: match[0], user: match[1]}
					])
					i += 1 // skip the newly created part
					return false
				} else {
					return true
				}
			})
		}
	}
	return parts
}

function partsHashtag(parts) {
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].type === "text") {
			tryMatch(parts[i].text, `#(${constants.external.hashtag_regex})`, match => {
				replacePart(parts, i, match, [
					{type: "hashtag", text: match[0], hashtag: match[1]}
				])
				i += 1 // skip the newly created part
			})
		}
	}
	return parts
}

function structure(text) {
	const parts = textToParts(text)
	partsUsername(parts)
	partsHashtag(parts)
	return parts
}

module.exports.structure = structure
module.exports.partsUsername = partsUsername
module.exports.partsHashtag = partsHashtag
