const fs = require("fs").promises
const pj = require("path").join
const db = require("../src/lib/db")
const {request} = require("../src/lib/utils/request")

;(async () => {
	const target = process.argv[2]
	if (!target) {
		console.log("Provide the file or URL to import from on the command line.")
		process.exit(1)
	}

	if (target.match(/^https?:\/\//)) {
		var usersString = await request(target).text()
	} else {
		var usersString = await fs.readFile(target, {encoding: "utf8"})
	}

	/** @type {{username: string, user_id: string, created: number, updated: number, updated_version: number, biography: string, post_count: number, following_count: number, followed_by_count: number, external_url: string, full_name: string, is_private: number, is_verified: number, profile_pic_url: string}[]} */
	const incomingUsers = JSON.parse(usersString)

	const existing = new Map()
	for (const row of db.prepare("SELECT user_id, updated, updated_version FROM Users").iterate()) {
		existing.set(row.user_id, row)
	}

	const base =
		"INTO Users (username,  user_id,  created,  updated,  updated_version,  biography,  post_count,  following_count,  followed_by_count,  external_url,  full_name,  is_private,  is_verified,  profile_pic_url) VALUES "
		         +"(@username, @user_id, @created, @updated, @updated_version, @biography, @post_count, @following_count, @followed_by_count, @external_url, @full_name, @is_private, @is_verified, @profile_pic_url)"
	const preparedReplace = db.prepare("REPLACE "+base)
	const preparedInsert = db.prepare("INSERT "+base)

	let newCount = 0
	let overwrittenCount = 0
	let skippedCount = 0

	db.transaction(() => {
		for (const user of incomingUsers) {
			if (existing.has(user.user_id)) {
				const existingRow = existing.get(user.user_id)
				if (existingRow.updated_version <= user.updated_version && existingRow.updated <= user.updated) {
					preparedReplace.run(user)
					overwrittenCount++
				} else {
					skippedCount++
				}
			} else {
				preparedInsert.run(user)
				newCount++
			}
		}
	})()

	console.log(`Imported ${incomingUsers.length} entries (${newCount} new, ${overwrittenCount} overwritten, ${skippedCount} skipped)`)
})()
