const fs = require("fs").promises
const {gzip} = require("zlib")
const {promisify: p} = require("util")
const pj = require("path").join
const db = require("../src/lib/db")

const targetDir = process.argv.slice(2).includes("--publish") ? "../src/site/html" : ".."
const shouldGzip = process.argv.slice(2).includes("--gzip")
const filename = "users_export.json" + (shouldGzip ? ".gz" : "")
const target = pj(__dirname, targetDir, filename)

async function progress(message, callback) {
	process.stdout.write(message)
	const result = await callback()
	process.stdout.write("done.\n")
	return result
}

;(async () => {
	let data = await progress("Preparing export data... ", () => {
		const users = db.prepare("SELECT * FROM Users").all()
		return Buffer.from(JSON.stringify(users), "utf8")
	})

	if (shouldGzip) {
		data = await progress("Compressing... ", () => p(gzip)(data))
	}

	await progress("Writing file... ", () => fs.writeFile(target, data))

	console.log(`Users exported to ${target}`)
})()
