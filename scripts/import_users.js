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
		var usersString = await request(target).then(res => res.text())
	} else {
		var usersString = await fs.readFile(target, {encoding: "utf8"})
	}
	/** @type {{username: string, user_id: string, created: number, updated: number, updated_version: number, biography: string, post_count: number, following_count: number, followed_by_count: number, external_url: string, full_name: string, is_private: number, is_verified: number, profile_pic_url: string}[]} */
	const users = JSON.parse(usersString)
	let newCount = 0
	let overwrittenCount = 0
	db.transaction(() => {
		for (const user of users) {
			const existing = db.prepare("SELECT user_id FROM Users WHERE username = ?").get(user.username)
			db.prepare(
				"REPLACE INTO Users (username,  user_id,  created,  updated,  updated_version,  biography,  post_count,  following_count,  followed_by_count,  external_url,  full_name,  is_private,  is_verified,  profile_pic_url) VALUES "
				+"(@username, @user_id, @created, @updated, @updated_version, @biography, @post_count, @following_count, @followed_by_count, @external_url, @full_name, @is_private, @is_verified, @profile_pic_url)"
			).run(user)
			if (existing) overwrittenCount++
			else newCount++
		}
	})()
	console.log(`Imported ${users.length} entries (${newCount} new, ${overwrittenCount} overwritten)`)
})()
