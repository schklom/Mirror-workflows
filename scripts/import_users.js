const fs = require("fs")
const {createGunzip} = require("zlib")
const db = require("../src/lib/db")
const getStream = require("get-stream")
const {request} = require("../src/lib/utils/request")

async function progress(message, callback) {
	process.stdout.write(message)
	const result = await callback()
	process.stdout.write("done.\n")
	return result
}

;(async () => {
	const target = process.argv[2]
	const isGzip = target.endsWith(".gz")
	if (!target) {
		console.log("Provide the file or URL to import from on the command line.")
		process.exit(1)
	}

	// Resolve input to stream
	if (target.match(/^https?:\/\//)) {
		console.log("Seems to be a URL, requesting now. This could take a few minutes. Be patient.")
		const ref = await request(target)
		const res = await ref.response()
		const lengthContainer = res.headers.get("content-length")
		if (lengthContainer) {
			const length = Number(Array.isArray(lengthContainer) ? lengthContainer[0] : lengthContainer)
			console.log(`${Math.floor(length/1000)} kB will be downloaded`)
		}
		var usersStream = await ref.stream()
	} else {
		/** @type {any} */
		var usersStream = await fs.createReadStream(target)
	}

	if (isGzip) {
		usersStream = usersStream.pipe(createGunzip())
	}

	// Read out the stream into a buffer
	/** @type {{username: string, user_id: string, created: number, updated: number, updated_version: number, biography: string, post_count: number, following_count: number, followed_by_count: number, external_url: string, full_name: string, is_private: number, is_verified: number, profile_pic_url: string}[]} */
	const incomingUsers = await progress("Reading data... ", async () => {
		const usersString = await getStream(usersStream, {encoding: "utf8"})
		return JSON.parse(usersString)
	})

	// Note the existing users
	const [existing, existingUsernames] = await progress("Noting existing users... ", () => {
		const existing = new Map()
		const existingUsernames = new Map()
		for (const row of db.prepare("SELECT username, user_id, updated, updated_version FROM Users").iterate()) {
			existing.set(row.user_id, row)
			existingUsernames.set(row.username, row.user_id)
		}
		return [existing, existingUsernames]
	})

	// Prepare queries
	const base =
		"INTO Users (username,  user_id,  created,  updated,  updated_version,  biography,  post_count,  following_count,  followed_by_count,  external_url,  full_name,  is_private,  is_verified,  profile_pic_url) VALUES "
		         +"(@username, @user_id, @created, @updated, @updated_version, @biography, @post_count, @following_count, @followed_by_count, @external_url, @full_name, @is_private, @is_verified, @profile_pic_url)"
	const preparedReplace = db.prepare("REPLACE "+base)
	const preparedInsert = db.prepare("INSERT "+base)
	const preparedDeleteByUsername = db.prepare("DELETE FROM Users WHERE username = ?")

	// Prepare counters
	let newCount = 0
	let overwrittenCount = 0
	let skippedCount = 0

	// Import new data
	await progress("Importing into database... ", () => {
		db.transaction(() => {
			for (const user of incomingUsers) {
				if (existing.has(user.user_id)) {
					const existingRow = existing.get(user.user_id)
					if (existingRow.updated_version <= user.updated_version && existingRow.updated < user.updated) {
						preparedReplace.run(user)
						overwrittenCount++
					} else {
						skippedCount++
					}
				} else {
					if (existingUsernames.has(user.username)) {
						/*
							The new row's user ID has not been seen, but the new row's username is already used.
							So somebody changed username at some point. Which person has the username now?
							We'll look at timestamps and accept the later version.
						*/
						const existingRow = existing.get(existingUsernames.get(user.username))
						if (existingRow.updated < user.updated) { // if the incoming copy has been updated more recently
							preparedDeleteByUsername.run(user.username) // delete the existing copy
							existing.delete(user.user_id)
							existingUsernames.delete(user.username)
							// proceed on to insert the new row
						} else { // the existing copy has been updated more recently, so skip this import
							skippedCount++
							continue // ew
						}
					}
					preparedInsert.run(user)
					newCount++
				}
			}
		})()
	})

	console.log(`Imported ${incomingUsers.length} entries (${newCount} new, ${overwrittenCount} overwritten, ${skippedCount} skipped)`)
})()
