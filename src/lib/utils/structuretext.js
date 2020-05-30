const constants = require("../constants")

const dots = [
	".", // full stop
	"\u00b7", // middle dot
	"\u2022", // bullet
	"\u2027", // hyphenation point
	"\u2219", // bullet operator
	"\u22c5", // dot operator
	"\u2e31", // word separator middle dot
	"\u2e33", // raised dot
	"\u30fb", // katakana middle dot
	"\uff65", // halfwidth katakana middle dot
]

const dotRegex = new RegExp(`[\n ][\n #${dots.join("")}]*$`, "gms")

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

/**
 * Edit a structure in-place to remove trailing hashtags and separator characters.
 */
function removeTrailingHashtags(structured) {
	let hasHashtags = structured.some(part => part.type === "hashtag")
	let seenHashtags = false

	function shouldRemoveLastPart() {
		const part = structured[structured.length-1]
		if (part.type === "hashtag") {
			seenHashtags = true
			return true
		} else if (part.type === "user") {
			if (hasHashtags && !seenHashtags) { // compromise?
				return true
			}
		} else if (part.type === "text") {
			const content = part.text.replace(dotRegex, "")
			if (content.length === 0) {
				return true
			} else {
				part.text = content
			}
		}
		return false
	}

	while (shouldRemoveLastPart()) {
		structured.pop()
	}

	return structured
}

module.exports.structure = structure
module.exports.partsUsername = partsUsername
module.exports.partsHashtag = partsHashtag
module.exports.removeTrailingHashtags = removeTrailingHashtags
