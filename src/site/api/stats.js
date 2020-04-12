const semver = require("semver")
const child_process = require("child_process")
const md = require("mixin-deep")
const constants = require("../../lib/constants")
const {history} = require("../../lib/collectors")
const switcher = require("../../lib/utils/torswitcher")
const {redirect} = require("pinski/plugins")

function reply(statusCode, content) {
	return {
		statusCode: statusCode,
		contentType: "application/json",
		content: JSON.stringify(content)
	}
}

// Load current commit hash

let commit = ""
{
	const p = child_process.spawn("git", ["rev-parse", "--short", "HEAD"])
	p.on("error", console.error)
	p.stdout.on("data", data => {
		const string = data.toString()
		commit = "-" + string.match(/[0-9a-f]+/)[0]
	})
}

// Set up inner versioning

const displayVersions = ["1.0", "1.1", "1.2", "1.3"]
const versions = new Map(displayVersions.map(v => [v, semver.coerce(v)]))
const features = [
	"PAGE_PROFILE",
	"PAGE_POST",
	"API_STATS",
	"API_STATS_SEMVER",
	"PAGE_HOME",
	"API_INSTANCES",
	"BLOCK_DETECT_USER_HTML"
]
if (constants.has_privacy_policy) features.push("PRIVACY_POLICY")
if (constants.as_assistant.enabled) {
	if (constants.as_assistant.require_key) features.push("ASSISTANT_PRIVATE")
	else features.push("ASSISTANT_PUBLIC")
}
const innerMap = new Map()
{
	const addVersion = function(shortVersion, block) {
		const coerced = semver.coerce(shortVersion)
		const previousVersion = semver.maxSatisfying([...innerMap.keys()], coerced.major+".x")
		let previous = {}
		if (previousVersion) previous = innerMap.get(previousVersion)
		md(block, previous)
		md(block, {version: shortVersion})
		innerMap.set(coerced.version, block)
	}
	addVersion("1.0", {
		features
	})
	addVersion("1.1", {
		availableVersions: [...versions.keys()],
		history: history.export()
	})
	addVersion("1.2", {
		settings: {
			rssEnabled: constants.settings.rss_enabled
		}
	})
	addVersion("1.3", {
		settings: {
			torAvailable: switcher.canUseTor() // server.js holds on loading this file until tor state is known, so this is fine
		}
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
			const selected = semver.maxSatisfying([...innerMap.keys()], url.searchParams.get("bv") || "1.0")
			if (!selected) return reply(400, {
				status: "fail",
				fields: ["q:bv"],
				message: "query parameter `bv` selects inner version, must be either missing or a semver query matching any of " + displayVersions.map(v => "`"+v+"`").join(", ") + "."
			})
			const inner = innerMap.get(selected)
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
