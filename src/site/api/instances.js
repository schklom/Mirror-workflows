const constants = require("../../lib/constants")
const {RequestCache} = require("../../lib/cache")
const {request} = require("../../lib/utils/request")
const {Parser} = require("../../lib/utils/parser/parser")

const instanceListCache = new RequestCache(constants.caching.instance_list_cache_time)

module.exports = [
	{
		route: "/api/instances", methods: ["GET"], code: () => {
			return instanceListCache.getOrFetch("instances", () => {
				return request(constants.resources.instances_wiki_raw).then(res => res.text()).then(text => {
					const result = (() => {
						const instances = []
						const parser = new Parser(text)
						parser.seek("# Instance list", {moveToMatch: true, useEnd: true})
						let inTable = false
						while (!inTable && parser.hasRemaining()) {
							parser.store()
							const line = parser.get({split: "\n"})
							if (line.startsWith("|")) {
								inTable = true
								parser.restore()
							}
						}
						if (!parser.hasRemaining()) return null
						while (inTable && parser.hasRemaining()) {
							const line = parser.get({split: "\n"})
							if (line.startsWith("|")) {
								/** [empty, official, address, country] */
								const parts = line.split("|")
								if (parts.length >= 4 && parts[2].includes("://")) {
									instances.push({
										address: parts[2].trim(),
										country: parts[3].match(/[A-Z]{2,}|$/)[0] || null,
										official: parts[1].trim() === ":white_check_mark:"
									})
								}
							} else {
								inTable = false
							}
						}
						return instances
					})()
					if (Array.isArray(result)) {
						return {
							statusCode: 200,
							contentType: "application/json",
							content: {
								status: "ok",
								version: "1.0",
								generatedAt: Date.now(),
								data: result
							}
						}
					} else {
						return {
							statusCode: 503,
							contentType: "application/json",
							content: {
								status: "fail",
								generatedAt: Date.now(),
								message: "Unable to parse the table from the wiki page: https://raw.githubusercontent.com/wiki/cloudrac3r/bibliogram/Instances.md"
							}
						}
					}
				})
			})
		}
	}
]
