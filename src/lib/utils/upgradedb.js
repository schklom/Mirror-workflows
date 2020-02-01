const constants = require("../constants")
const pj = require("path").join
const db = require("../db")
require("../testimports")(db)

const deltas = new Map([
	// empty file to version 1
	[1, function() {
		db.prepare("DROP TABLE IF EXISTS Users")
			.run()
		db.prepare("DROP TABLE IF EXISTS DatabaseVersion")
			.run()
		db.prepare("DROP TABLE IF Exists Posts")
			.run()

		db.prepare("CREATE TABLE Users (username TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL UNIQUE, PRIMARY KEY (username))")
			.run()
		db.prepare("CREATE TABLE DatabaseVersion (version INTEGER NOT NULL UNIQUE, PRIMARY KEY (version))")
			.run()
		db.prepare("CREATE TABLE Posts (shortcode TEXT NOT NULL UNIQUE, id TEXT NOT NULL UNIQUE, id_as_numeric NUMERIC NOT NULL, username TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (shortcode))")
			// for future investigation: may not be able to sort by id as a string, may not be able to fit entire id in numeric type
			.run()
	}]
])

module.exports = async function() {
	let currentVersion = 0
	try {
		currentVersion = db.prepare("SELECT version FROM DatabaseVersion").pluck().get() || 0
	} catch (e) {}

	const newVersion = constants.database_version

	if (currentVersion !== newVersion) {
		console.log(`Upgrading database from version ${currentVersion} to version ${newVersion}...`)
		// go through the entire upgrade path
		for (let entry = currentVersion+1; entry <= newVersion; entry++) {
			// Back up current version
			if (entry !== 1) {
				const filename = `backups/bibliogram.db.bak-v${entry-1}`
				process.stdout.write(`Backing up current to ${filename}... `)
				await db.backup(pj(__dirname, "../../../db", filename))
				process.stdout.write("done.\n")
			}
			// Run delta
			process.stdout.write(`Using script ${entry}... `)
			deltas.get(entry)()
			db.prepare("DELETE FROM DatabaseVersion").run()
			db.prepare("INSERT INTO DatabaseVersion (version) VALUES (?)").run(entry)
			process.stdout.write("done.\n")
		}
		console.log(
			   "Upgrade complete."
			+"\n-----------------"
		)
	}
}
