const constants = require("../../lib/constants")
const child_process = require("child_process")
const {history} = require("../../lib/collectors")
const {redirect} = require("pinski/plugins")

function reply(statusCode, content) {
	return {
		statusCode: statusCode,
		contentType: "application/json",
		content: JSON.stringify(content)
	}
}

let commit = ""
{
	const p = child_process.spawn("git", ["rev-parse", "--short", "HEAD"])
	p.on("error", console.error)
	p.stdout.on("data", data => {
		const string = data.toString()
		commit = "-" + string.match(/[0-9a-f]+/)[0]
	})
}

module.exports = [
	{
		route: "/.well-known/nodeinfo", methods: ["GET"], code: async ({fill}) => {
			return reply(200, {
				link: [
					{
						rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
						href: `${constants.website_origin}/api/stats/2.0`
					}
				]
			})
		}
	},
	{
		route: "/api/stats", methods: ["GET"], code: async () => {
			return redirect("/api/stats/2.0", 302)
		}
	},
	{
		route: "/api/stats/2.0", methods: ["GET"], code: async ({url}) => {
			const versions = ["1.0", "1.1", "1.2"]
			const features = [
				"PAGE_PROFILE",
				"PAGE_POST",
				"API_STATS",
				"PAGE_HOME",
				"API_INSTANCES",
				"BLOCK_DETECT_USER_HTML"
			]
			const inner = (
				new Map([
					["1.0", {
						version: "1.0",
						features
					}],
					["1.1", {
						version: "1.1",
						availableVersions: versions,
						features,
						history: history.export()
					}],
					["1.2", {
						version: "1.2",
						availableVersions: versions,
						features,
						history: history.export(),
						settings: {
							rssEnabled: constants.settings.rss_enabled
						}
					}]
				])
			).get(url.searchParams.get("bv") || versions[0])
			if (!inner) return reply(400, {
				status: "fail",
				fields: ["q:bv"],
				message: "query parameter `bv` selects version, must be either missing or any of " + versions.map(v => "`"+v+"`").join(", ") + "."
			})
			return reply(200, {
				version: "2.0",
				software: {
					name: "bibliogram",
					version: "1.0.0"+commit
				},
				protocols: [],
				services: {
					inbound: [
						"instagram"
					],
					outbound: []
				},
				openRegistrations: false,
				usage: {
					users: {
						total: 0,
						activeHalfyear: 0,
						activeMonth: 0
					}
				},
				metadata: {
					bibliogram: inner
				}
			})
		}
	}
]
