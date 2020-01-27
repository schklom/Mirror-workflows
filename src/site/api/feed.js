const constants = require("../../lib/constants")
const {fetchUser} = require("../../lib/collectors")
const {render} = require("pinski/plugins")

module.exports = [
	{route: `/u/(${constants.external.username_regex})/rss.xml`, methods: ["GET"], code: ({fill}) => {
		return fetchUser(fill[0]).then(async user => {
			const content = await user.timeline.fetchFeed()
			const xml = content.xml()
			return {
				statusCode: 200,
				contentType: "application/rss+xml", // see https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed
				content: xml
			}
		}).catch(error => {
			if (error === constants.symbols.NOT_FOUND) {
				return render(404, "pug/friendlyerror.pug", {
					statusCode: 404,
					title: "Not found",
					message: "This user doesn't exist."
				})
			} else {
				throw error
			}
		})
	}}
]
