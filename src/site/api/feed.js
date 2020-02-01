const constants = require("../../lib/constants")
const {fetchUser, requestCache} = require("../../lib/collectors")
const {render} = require("pinski/plugins")
const {pugCache} = require("../passthrough")

module.exports = [
	{route: `/u/(${constants.external.username_regex})/rss.xml`, methods: ["GET"], code: ({fill}) => {
		if (constants.settings.rss_enabled) {
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
						message: "This user doesn't exist.",
						withInstancesLink: false
					})
				} else if (error === constants.symbols.INSTAGRAM_DEMANDS_LOGIN) {
					return {
						statusCode: 503,
						contentType: "text/html",
						headers: {
							"Retry-After": requestCache.getTtl("user/"+fill[0], 1000)
						},
						content: pugCache.get("pug/blocked.pug").web({
							expiresMinutes: requestCache.getTtl("user/"+fill[0], 1000*60)
						})
					}
				} else {
					throw error
				}
			})
		} else {
			return Promise.resolve(render(403, "pug/friendlyerror.pug", {
				statusCode: 403,
				title: "RSS disabled",
				message: "RSS is disabled on this instance.",
				withInstancesLink: true
			}))
		}
	}}
]
