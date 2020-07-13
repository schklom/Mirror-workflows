// @ts-check

const path = require("path")
const readline = require("readline")
const fs = require("fs")

const logPath = process.argv[2]
if (!logPath) {
	console.log("Specify the path to the nginx log file as a command line argument.")
	process.exit(1)
}

const outPath = "./dates.csv"

const reader = readline.createInterface({
	input: fs.createReadStream(logPath),
})

class MapOfNumber {
	constructor() {
		this.backing = new Map()
	}

	add(key) {
		this.backing.set(key, this.get(key) + 1)
	}

	get(key) {
		return this.backing.has(key) ? this.backing.get(key) : 0
	}

	sort() {
		return [...this.backing.entries()].sort((a, b) => (b[1] - a[1]))
	}
}

/**
 * @template K,V
 */
class MapOfArray {
	constructor() {
		/** @type {Map<K, V[]>} */
		this.backing = new Map()
	}

	add(key, value) {
		if (this.backing.has(key)) {
			this.backing.get(key).push(key, value)
		} else {
			this.backing.set(key, [value])
		}
	}

	get(key) {
		return this.backing.has(key) ? this.backing.get(key) : []
	}
}

class DateCollection {
	constructor(startTime, interval) {
		this.startTime = startTime
		this.interval = interval
		/** @type {Map<string, number[]>} */
		this.backing = new Map()
	}

	timestampToIndex(timestamp) {
		return Math.floor((timestamp - this.startTime) / this.interval)
	}

	add(key, timestamp) {
		const index = this.timestampToIndex(timestamp)
		let row
		if (!this.backing.has(key)) {
			row = []
			this.backing.set(key, [])
		} else {
			row = this.backing.get(key)
		}
		while (row.length < index+1) {
			row.push(0)
		}
		row[index]++
	}
}

// ip, date, method, path, status, bytes, userAgent
const regex = /^([^ ]+) - - \[([^\]]+)\] "([A-Z]+) ([^"]+) HTTP\/(?:1.0|1.1|2.0)" ([0-9]+) ([0-9]+) "([^"]*)"$/

function parseLine(line) {
	const result = line.match(regex)
	if (!result) {
		// console.log("Line didn't match regular expression:")
		// console.log(line)
		return null
	} else {
		return {
			ip: result[1],
			date: result[2],
			method: result[3],
			path: result[4],
			status: result[5],
			bytes: +result[6],
			userAgent: result[7]
		}
	}
}

const additionalStatic = ["/android-chrome-512x512.png", "/safari-pinned-tab.svg", "/robots.txt", "/bibliogram.webmanifest", "/apple-touch-icon.png", "/favicon-32x32.png", "/favicon-16x16.png", "/favicon.ico", "/android-chrome-192x192.png"]

let total = 0
let ipv4c = 0
let ipv6c = 0
const ipSet = new Set()
let kinds = {
	proxied: 0,
	feed: 0,
	users: 0,
	posts: 0,
	static: 0,
	userFragments: 0,
	postFragments: 0,
	fpredirects: 0,
	home: 0,
	api: 0
}
const statuses = new MapOfNumber()
const ips = new MapOfNumber()
/** @type {DateCollection} */
let dateCollection = null

reader.on("line", line => {
	const parsed = parseLine(line)
	if (!parsed) return
	const dateObject = new Date(parsed.date.replace(":", " "))

	//console.log(parsed)

	if (!dateCollection) {
		dateCollection = new DateCollection(dateObject.getTime(), 60*60*1000)
	}

	total++
	ipSet.add(parsed.ip)

	if (parsed.ip.includes(":")) ipv6c++
	else ipv4c++

	statuses.add(parsed.status)

	let kind = null
	if (parsed.path === "/") {
		kind = "home";
	} else if (parsed.path.startsWith("/imageproxy") || parsed.path.startsWith("/videoproxy")) {
		kind = "proxied";
	} else if (parsed.path.endsWith(".xml")) {
		kind = "feed";
	} else if (parsed.path.startsWith("/static/") || additionalStatic.includes(parsed.path)) {
		kind = "static";
	} else if (parsed.path.startsWith("/u/")) {
		kind = "users";
	} else if (parsed.path.startsWith("/p/")) {
		kind = "posts";
	} else if (parsed.path.startsWith("/fragment/user")) {
		kind = "userFragments";
	} else if (parsed.path.startsWith("/fragment/post")) {
		kind = "postFragments";
	} else if (parsed.path.startsWith("/u") || parsed.path.startsWith("/p")) {
		kind = "fpredirects";
	} else if (parsed.path.startsWith("/api/") || parsed.path === "/.well-known/nodeinfo") {
		kind = "api";
	} else if (parsed.status !== "404" && parsed.status !== "301") {
		//console.log(parsed)
	}
	if (kind) {
		kinds[kind]++
		dateCollection.add(kind, dateObject.getTime())
		if (kind === "api") ips.add(parsed.ip)
	}
})

function numberSummary(part, total, padSize = 6) {
	return `${part.toString().padStart(padSize, " ")} (${(part/total*100).toFixed(1).toString().padStart(4, " ")}%)`
}

reader.on("close", () => {
	console.log(`${total} total requests`)
	console.log(`${numberSummary(ipv4c, total)} requests over IPv4`)
	console.log(`${numberSummary(ipv6c, total)} requests over IPv6`)
	console.log()
	console.log(`${ipSet.size} unique IPs after anonymisation (#[a(href="https://bibliogram.art/privacy") see here])`)
	console.log()
	console.log(`${numberSummary(statuses.get("200") + statuses.get("206"), total)} requests resulted in 200 OK`)
	console.log(`${numberSummary(statuses.get("301") + statuses.get("302") + statuses.get("303"), total)} requests resulted in 3XX redirect`)
	console.log(`${numberSummary(statuses.get("503"), total)} requests resulted in 503 Service Unavailable (blocked)`)
	console.log(`${numberSummary(statuses.get("404"), total)} requests resulted in 404 Not Found`)
	console.log(`${numberSummary(statuses.get("502"), total)} requests resulted in 502 Bad Gateway`)
	console.log()
	console.log(`${numberSummary(kinds.static, total)} requests were for static content or static files`)
	console.log(`${numberSummary(kinds.proxied, total)} requests were for proxied images/videos`)
	console.log(`${numberSummary(kinds.feed, total)} requests were for feeds (!)`)
	console.log(`${numberSummary(kinds.users, total)} requests were for users`)
	console.log(`${numberSummary(kinds.userFragments, total)} requests were for user fragments (timeline continuation ajax)`)
	console.log(`${numberSummary(kinds.postFragments, total)} requests were for post fragments (post overlay ajax)`)
	console.log(`${numberSummary(kinds.posts, total)} requests were for posts`)
	console.log(`${numberSummary(kinds.api, total)} requests were for the API`)
	console.log(`${numberSummary(kinds.home, total)} requests were for the home page`)
	console.log(`${numberSummary(kinds.fpredirects, total)} requests were seeking a user or post from the home page`)
	console.log()
	const out = fs.createWriteStream(outPath)
	for (const entry of dateCollection.backing) {
		out.write(`${entry[0]};${entry[1].join(";")}\n`)
	}
	console.log(`Overwrote ${outPath}`)
	console.log()

	const sorted = ips.sort()
	const percentile = 98
	console.log("Top 10 IPs:")
	console.log(sorted.slice(0, 10))
	console.log(`${percentile}th percentile:`)
	console.log(sorted[Math.floor(sorted.length / 100 * (100 - percentile))])
})
