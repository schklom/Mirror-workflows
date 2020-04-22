const {Pinski} = require("pinski")
const {subdirs} = require("node-dir")
const constants = require("../lib/constants")

const passthrough = require("./passthrough")

const pinski = new Pinski({
	port: +process.env.PORT || constants.port,
	ip: constants.bind_ip,
	relativeRoot: __dirname,
	basicCacheControl: {
		exts: ["ttf", "woff2", "png", "jpg", "jpeg", "svg", "gif", "webmanifest", "ico"],
		seconds: 604800
	},
})

subdirs("pug", async (err, dirs) => {
	if (err) throw err

	// need to check for and run db upgrades before anything starts using it
	await require("../lib/utils/upgradedb")()

	pinski.setNotFoundTarget("/404")
	pinski.addRoute("/static/css/main.css", "sass/main.sass", "sass")
	pinski.addPugDir("pug", dirs)
	pinski.addAPIDir("html/static/js/templates/api")
	pinski.addSassDir("sass")
	pinski.muteLogsStartingWith("/imageproxy")
	pinski.muteLogsStartingWith("/videoproxy")
	pinski.muteLogsStartingWith("/static")

	for (const route of constants.additional_routes) {
		pinski.addRoute(route.web, route.local, route.type)
	}

	if (constants.tor.enabled) {
		await require("../lib/utils/tor") // make sure tor state is known before going further
	}

	pinski.addAPIDir("api")

	if (constants.as_assistant.enabled) {
		console.log("Assistant API enabled")
		pinski.addAPIDir("assistant_api")
	}

	pinski.startServer()

	require("pinski/plugins").setInstance(pinski)

	Object.assign(passthrough, pinski.getExports())

	console.log("Server started")

	if (process.stdin.isTTY || process.argv.includes("--enable-repl")) {
		require("./repl")
	}
})
