const {Pinski} = require("pinski")
const {subdirs} = require("node-dir")
const constants = require("../lib/constants")

const passthrough = require("./passthrough")

const pinski = new Pinski({
	port: constants.port,
	relativeRoot: __dirname
})

;(async (err, dirs) => {
	if (err) throw err

	// need to check for and run db upgrades before anything starts using it
	await require("../lib/utils/upgradedb")()

	if (constants.tor.enabled) {
		await require("../lib/utils/tor") // make sure tor state is known before going further
	}

	pinski.addAPIDir("assistant_api")
	pinski.startServer()
	pinski.enableWS()

	require("pinski/plugins").setInstance(pinski)

	Object.assign(passthrough, pinski.getExports())

	console.log("Assistant started")

	if (constants.allow_user_from_reel !== "never") {
		constants.allow_user_from_reel = "never"
		console.log(`[!] You are running the assistant, so \`constants.allow_user_from_reel\` has been set to "never" for this session.`)
	}

	if (process.stdin.isTTY || process.argv.includes("--enable-repl")) {
		require("./repl")
	}
})()
