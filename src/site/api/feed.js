const constants = require("../../lib/constants")
const {fetchUser, userRequestCache} = require("../../lib/collectors")
const {render} = require("pinski/plugins")
const {pugCache} = require("../passthrough")

module.exports = [
	{route: `/u/(${constants.external.username_regex})/(rss|atom)\\.xml`, methods: ["GET"], code: ({fill}) => {
		if (constants.settings.rss_enabled) {
			const kind = fill[1]
			return fetchUser(fill[0], constants.symbols.fetch_context.RSS).then(async user => {
				const feed = await user.timeline.fetchFeed()
				if (kind === "rss") {
					var data = {
						contentType: "application/rss+xml", // see https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed,
						content: feed.rss2()
					}
				} else if (kind === "atom") {
					var data = {
						contentType: "application/atom+xml", // see https://en.wikipedia.org/wiki/Atom_(standard)#Including_in_HTML
						content: feed.atom1()
					}
				}
				return {
					statusCode: 200,
					contentType: data.contentType,
					headers: {
						"Cache-Control": `public, max-age=${userRequestCache.getTtl("user/"+user.data.username, 1000)}`
					},
					content: data.content
				}
			}).catch(error => {
				if (error === constants.symbols.NOT_FOUND || error === constants.symbols.ENDPOINT_OVERRIDDEN) {
					return render(404, "pug/friendlyerror.pug", {
						statusCode: 404,
						title: "Not found",
						message: "This user doesn't exist.",
						withInstancesLink: false
					})
				} else if (error === constants.symbols.INSTAGRAM_DEMANDS_LOGIN || error === constants.symbols.RATE_LIMITED) {
					return {
						statusCode: 503,
						contentType: "text/html",
						headers: {
							"Cache-Control": `public, max-age=${userRequestCache.getTtl("user/"+fill[0], 1000)}`,
							"Retry-After": userRequestCache.getTtl("user/"+fill[0], 1000)
						},
						content: pugCache.get("pug/blocked.pug").web({
							expiresMinutes: userRequestCache.getTtl("user/"+fill[0], 1000*60)
						})
					}
				} else if (error === constants.symbols.extractor_results.AGE_RESTRICTED) {
					return render(403, "pug/age_gated.pug")
				} else {
					throw error
				}
			})
		} else {
			return Promise.resolve(render(403, "pug/friendlyerror.pug", {
				statusCode: 403,
				title: "Feeds disabled",
				message: "Feeds are disabled on this instance.",
				withInstancesLink: true
			}))
		}
	}}
]
