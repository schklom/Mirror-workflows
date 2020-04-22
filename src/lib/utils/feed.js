const constants = require("../constants")

function getFeedSetup(username, description, image, updated) {
	const usedName = `@${username}`
	return {
		title: usedName,
		description,
		id: `bibliogram:user/${username}`,
		link: `${constants.website_origin}/u/${username}`,
		feedLinks: {
			rss: `${constants.website_origin}/u/${username}/rss.xml`,
			atom: `${constants.website_origin}/u/${username}/atom.xml`
		},
		image,
		updated,
		author: {
			name: usedName,
			link: `${constants.website_origin}/u/${username}`
		}
	}
}

module.exports.getFeedSetup = getFeedSetup
