const fs = require("fs").promises
const constants = require("../../lib/constants")

// Instances are here rather than loaded dynamically because adding more requires the script to auto-update, which requires a version increase
const instanceList = new Set([
	"https://bibliogram.art",
	"https://bibliogram.snopyta.org",
	"https://bibliogram.pussthecat.org",
	"https://bibliogram.13ad.de",
	"https://bibliogram.nixnet.services",
	"https://bibliogram.hamster.dance",
	"https://bibliogram.ggc-project.de"
])

instanceList.add(constants.website_origin)

module.exports = [
	{
		route: "/userscripts/unblock.user.js", methods: ["GET"], code: async () => {
			let script = await fs.readFile("html/userscripts/unblock.user.js", "utf8")
			script = script.replace(/<website_origin>/g, constants.website_origin)
			script = script.replace(/\/\/ <instance_match_list>/g, [...instanceList.values()].map(i => `// @match       ${i}/u/*`).join("\n"))
			return {
				statusCode: 200,
				contentType: "application/javascript",
				content: script
			}
		}
	}
]
