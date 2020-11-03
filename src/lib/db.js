const sqlite = require("better-sqlite3")
const pj = require("path").join
const fs = require("fs")

const dir = pj(__dirname, "../../db")
fs.mkdirSync(pj(dir, "backups"), {recursive: true})
const db = new sqlite(pj(dir, "bibliogram.db"))
db.pragma("journal_mode = WAL")
module.exports = db
