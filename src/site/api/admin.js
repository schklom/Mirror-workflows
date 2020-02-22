const child_process = require("child_process")
const constants = require("../../lib/constants")
const {render} = require("pinski/plugins")

function run(command) {
	return new Promise((resolve, reject) => {
		child_process.exec(command, {encoding: "utf8"}, (error, stdout, stderr) => {
			if (error) reject(error)
			else resolve({stdout, stderr})
		})
	})
}

let lastFetchRunAt = 0
async function fetch() {
	if (lastFetchRunAt + constants.caching.updater_cache_time < Date.now()) {
		await run("git fetch origin")
		lastFetchRunAt = Date.now()
	}
}

module.exports = [
	{route: "/admin/updater", methods: ["GET"], code: async () => {
		if (constants.settings.enable_updater_page) {
			let {stdout: current} = await run("git rev-parse --abbrev-ref HEAD")
			current = current.trim()
			let {stdout: upstream} = await run("git rev-parse --abbrev-ref '@{u}'")
			upstream = upstream.trim()
			if (current !== "master" || upstream !== "origin/master") {
				return render(200, "pug/admin_update.pug", {error: `Refusing to automatically update: current is ${current}, upstream is ${upstream}, need master and origin/master`})
			} else {
				await fetch()
				let {stdout: log} = await run("git log --oneline origin/master ^master")
				log = log.trim()
				const numberOfCommits = log === "" ? 0 : log.split("\n").length
				const {stdout: changedFiles} = await run("git diff master origin/master --name-only")
				const changedFilesList = changedFiles.trim().split("\n")
				let requiresRestart = false
				let requiresDeps = false
				if (changedFilesList.some(c => c.startsWith("src/lib") || c === "server.js")) {
					requiresRestart = true
				}
				if (changedFilesList.some(c => c === "package.json" || c === "package-lock.json")) {
					requiresDeps = true
					requiresRestart = true
				}
				const formattedLog = log.split("\n").map(line => {
					if (!line) return line // skip for empty string
					const [hash, message] = line.match(/(\w+) (.*)$/).slice(1)
					return {hash, message}
				})
				return render(200, "pug/admin_update.pug", {formattedLog, numberOfCommits, requiresDeps, requiresRestart})
			}
		} else {
			return render(403, "pug/friendlyerror.pug", {
				statusCode: 403,
				title: "Updater page disabled",
				message: "Updater page disabled"
			})
		}
	}}
]
