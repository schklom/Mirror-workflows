const fs = require("fs").promises
const pj = require("path").join
const db = require("../src/lib/db")

;(async () => {
	const users = db.prepare("SELECT * FROM Users").all()
	const targetDir = process.argv.slice(2).includes("--publish") ? "../src/site/html" : ".."
	const target = pj(__dirname, targetDir, "users_export.json")
	fs.writeFile(target, JSON.stringify(users), {encoding: "utf8"})
	console.log(`Users exported to ${target}`)
})()
