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
	}],
	// version 1 to version 2
	[2, function() {
		db.transaction(() => {
			db.prepare(
				"CREATE TABLE Users_New (username TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL UNIQUE, created INTEGER NOT NULL, updated INTEGER NOT NULL"
				+", updated_version INTEGER NOT NULL, biography TEXT, post_count INTEGER NOT NULL, following_count INTEGER NOT NULL, followed_by_count INTEGER NOT NULL, external_url TEXT"
				+", full_name TEXT, is_private INTEGER NOT NULL, is_verified INTEGER NOT NULL, profile_pic_url TEXT NOT NULL"
				+", PRIMARY KEY (username))"
			)
				.run()
			db.prepare("INSERT INTO Users_New SELECT username, user_id, 0, 0, 1, NULL, 0, 0, 0, NULL, NULL, 0, 0, '' from Users")
				.run()
			db.prepare("DROP TABLE Users")
				.run()
			db.prepare("ALTER TABLE Users_New RENAME TO Users")
				.run()
		})()
	}],
	// version 2 to version 3
	[3, function() {
		db.transaction(() => {
			db.prepare("DROP TABLE IF EXISTS RequestHistory")
				.run()
			db.prepare("CREATE TABLE RequestHistory (type TEXT NOT NULL, success INTEGER NOT NULL, timestamp INTEGER NOT NULL)")
				.run()
		})()
	}],
	// version 3 to version 4
	[4, function() {
		db.transaction(() => {
			db.prepare("DROP TABLE IF EXISTS UserSettings")
				.run()
			db.prepare(
				"CREATE TABLE UserSettings (token TEXT NOT NULL, created INTEGER NOT NULL, language TEXT NOT NULL, show_comments INTEGER NOT NULL, link_hashtags INTEGER NOT NULL"
				+", spa INTEGER NOT NULL, theme TEXT NOT NULL, caption_side TEXT NOT NULL, display_alt INTEGER NOT NULL"
				+", PRIMARY KEY (token))"
			)
				.run()
		})()
	}],
	// version 4 to version 5
	[5, function() {
		db.transaction(() => {
			// the previous version wasn't around for long enough for me to care about the contents
			db.prepare("DROP TABLE IF EXISTS UserSettings")
				.run()
			db.prepare(
				"CREATE TABLE UserSettings (token TEXT NOT NULL, created INTEGER NOT NULL, language TEXT NOT NULL, show_comments INTEGER NOT NULL, link_hashtags INTEGER NOT NULL"
				+", spa INTEGER NOT NULL, theme TEXT NOT NULL, caption_side TEXT NOT NULL, display_alt INTEGER NOT NULL, timeline_columns TEXT NOT NULL, display_top_nav INTEGER NOT NULL"
				+", PRIMARY KEY (token))"
			)
				.run()
		})()
	}],
	// version 5 to version 6
	[6, function() {
		db.transaction(() => {
			db.prepare("ALTER TABLE UserSettings ADD COLUMN save_data TEXT NOT NULL DEFAULT 'automatic'")
				.run()
			db.prepare("ALTER TABLE UserSettings ADD COLUMN rewrite_youtube TEXT NOT NULL DEFAULT ''")
				.run()
			db.prepare("ALTER TABLE UserSettings ADD COLUMN rewrite_twitter TEXT NOT NULL DEFAULT ''")
				.run()
		})()
	}],
	// version 6 to version 7
	[7, function() {
		db.transaction(() => {
			db.prepare("DROP TABLE IF EXISTS CSRFTokens")
				.run()
			db.prepare("CREATE TABLE CSRFTokens (token TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY (token))")
				.run()
		})()
	}],
	// version 7 to version 8
	[8, function() {
		db.transaction(() => {
			db.prepare("ALTER TABLE UserSettings ADD COLUMN remove_trailing_hashtags INTEGER NOT NULL DEFAULT 0")
				.run()
			db.prepare("ALTER TABLE UserSettings ADD COLUMN infinite_scroll TEXT NOT NULL DEFAULT 'normal'")
				.run()
		})()
	}],
	// version 8 to version 9
	[9, function() {
		db.transaction(() => {
			db.prepare("DROP TABLE IF EXISTS SavedRequests")
				.run()
			db.prepare("CREATE TABLE SavedRequests (url TEXT NOT NULL, path TEXT NOT NULL, PRIMARY KEY (url))")
				.run()
		})()
	}]
])

function writeProgress(i) {
	const size = deltas.size
	const progress = "=".repeat(i) + " ".repeat(deltas.size-i)
	const numberLength = String(deltas.size).length
	if (process.stdout.isTTY) {
		process.stdout.cursorTo(0)
	}
	process.stdout.write(
		`Creating database... (${String(i).padStart(numberLength, " ")}`
		+`/${String(size).padStart(numberLength, " ")}) [${progress}]`
	)
	if (!process.stdout.isTTY) {
		process.stdout.write("\n")
	}
}

async function createBackup(entry) {
	const filename = `backups/bibliogram.db.bak-v${entry-1}`
	process.stdout.write(`Backing up current to ${filename}... `)
	await db.backup(pj(__dirname, "../../../db", filename))
	process.stdout.write("done.\n")
}

/**
 * @param {number} entry
 * @param {boolean} log
 */
function runDelta(entry, log) {
	if (log) process.stdout.write(`Using script ${entry}... `)
	deltas.get(entry)()
	db.prepare("DELETE FROM DatabaseVersion").run()
	db.prepare("INSERT INTO DatabaseVersion (version) VALUES (?)").run(entry)
	if (log) process.stdout.write("done.\n")
}

module.exports = async function() {
	let currentVersion = 0
	let upgradeType = "stages" // "stages", "progress", whether to execute each stage at a time or show a progress bar and run all
	try {
		currentVersion = db.prepare("SELECT version FROM DatabaseVersion").pluck().get() || 0
	} catch (e) {}

	if (currentVersion === 0) {
		upgradeType = "progress"
		console.log(
			   "Welcome to Bibliogram! Thank you for installing."
			+"\n"
			+"\n  -> Make sure you have set `config/website_origin`"
			+"\n     as instructed in the installation guide."
			+"\n  -> Consider adding yourself to the instance list:"
			+"\n     https://git.sr.ht/~cadence/bibliogram-docs/tree/master/docs/Instances.md"
			+"\n  -> Join the Matrix chatroom for help: #bibliogram:matrix.org"
			+"\n"
		)
		writeProgress(0)
		await new Promise(resolve => setTimeout(resolve, 300))
	}

	const newVersion = constants.database_version

	if (currentVersion !== newVersion) {
		if (upgradeType === "stages") {
			console.log(`Upgrading database from version ${currentVersion} to version ${newVersion}...`)
		}

		// go through the entire upgrade sequence
		for (let entry = currentVersion+1; entry <= newVersion; entry++) {
			// Back up current version
			if (upgradeType === "stages" && entry !== 1) {
				await createBackup(entry)
			}

			// Run delta
			runDelta(entry, upgradeType === "stages")

			if (upgradeType === "progress") {
				writeProgress(entry)
			}
		}

		if (upgradeType === "stages") {
			console.log(
					"Upgrade complete."
				+"\n-----------------"
			)
		} else {
			process.stdout.write(" done.\n\n")
			await new Promise(resolve => setTimeout(resolve, 300))
		}
	}
}
