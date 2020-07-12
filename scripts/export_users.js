const fs = require("fs").promises
const {gzip} = require("zlib")
const {promisify: p} = require("util")
const pj = require("path").join
const db = require("../src/lib/db")

const targetDir = process.argv.slice(2).includes("--publish") ? "../src/site/html" : ".."
const shouldGzip = process.argv.slice(2).includes("--gzip")
const filename = "users_export.json" + (shouldGzip ? ".gz" : "")
const target = pj(__dirname, targetDir, filename)

;(async () => {
	const users = db.prepare("SELECT * FROM Users").all()
	let data = Buffer.from(JSON.stringify(users), "utf8")

	if (shouldGzip) {
		data = await p(gzip)(data)
	}

	await fs.writeFile(target, data)

	console.log(`Users exported to ${target}`)
})()
