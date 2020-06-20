const {Readable} = require("stream")
const fs = require("fs").promises

const db = require("../../lib/db")
const collectors = require("../../lib/collectors")
const constants = require("../../lib/constants")

/** @type {Set<Waiter>} */
const waiters = new Set()

setInterval((new (function() {
	const payload = `:keepalive ${Date.now()}\n\n`
	for (const waiter of waiters.values()) {
		waiter.stream.push(payload)
	}
})).constructor, 50000).unref()

class Waiter {
	constructor(username) {
		const _this = this
		this.username = username
		this.stream = new Readable({
			autoDestroy: true,
			// @ts-ignore
			emitClose: true,
			read: function() {},
			destroy: function() {
				waiters.delete(_this)
			}
		})
		this.stream.push(":connected\n\n")
		this.stream.on("end", () => {
			waiters.delete(this)
		})
		waiters.add(this)
	}

	complete() {
		this.stream.push("event: profile_available\ndata: profile_available\n\n")
		this.stream.push(null)
		waiters.delete(this)
	}
}

module.exports = [
	{
		route: "/api/suggest_user/v1", methods: ["POST"], upload: true, code: async ({url, body}) => {
			body = body.toString()
			const respondAsPlaintext = url.searchParams.has("plaintext")
			const params = new URLSearchParams(body)
			const missingParams = []
			if (!params.has("username")) missingParams.push("username")
			if (!params.has("user_id")) missingParams.push("user_id")
			if (missingParams.length) {
				return {
					statusCode: 400,
					contentType: "application/json",
					content: {
						status: "fail",
						version: "1.0",
						generatedAt: Date.now(),
						message: "These required POST body parameters were missing: " + missingParams.join(", "),
						fields: missingParams.map(p => `bp:${p}`),
						identifier: "MISSING_REQUIRED_PARAMETERS"
					}
				}
			}
			const username = params.get("username")
			const userID = (params.get("user_id").match(/\d+/) || [])[0]
			if (!userID) {
				return {
					statusCode: 400,
					contentType: "application/json",
					content: {
						status: "fail",
						version: "1.0",
						generatedAt: Date.now(),
						message: "The user_id parameter must be a number.",
						fields: ["bp:user_id"],
						identifier: "MALFORMED_USER_ID"
					}
				}
			}
			const existing = db.prepare("SELECT * FROM Users WHERE user_id = ?").get(userID)
			if (existing) {
				if (respondAsPlaintext) {
					return {
						statusCode: 403,
						contentType: "text/plain",
						content: "The user is already known. Nothing has changed.\n"
					}
				} else {
					return {
						statusCode: 403,
						contentType: "application/json",
						content: {
							status: "fail",
							version: "1.0",
							generatedAt: Date.now(),
							message: "The user is already known. Nothing has changed.",
							identifier: "USER_ALREADY_KNOWN"
						}
					}
				}
			}
			return collectors.verifyUserPair(userID, username).then(valid => {
				if (!valid) {
					return {
						statusCode: 400,
						contentType: "application/json",
						content: {
							status: "fail",
							version: "1.0",
							generatedAt: Date.now(),
							message: "The user_id and username do not refer to the same user.",
							identifier: "IDENTIFIERS_DO_NOT_MATCH"
						}
					}
				}
				db.prepare(
					"INSERT INTO Users (user_id, username, created, updated, updated_version, post_count, following_count, followed_by_count, is_private, is_verified, profile_pic_url)"
					+" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
				).run(
					userID, username, Date.now(), Date.now(), 1, 0, 0, 0, 0, 0, ""
				)
				collectors.userRequestCache.cache.delete("user/"+username)
				for (const waiter of waiters) {
					if (waiter.username === username) waiter.complete()
				}
				if (respondAsPlaintext) {
					return {
						statusCode: 201,
						contentType: "text/plain",
						content: "User added! Go back to your web browser.\n"
					}
				} else {
					return {
						statusCode: 201,
						contentType: "application/json",
						content: {
							status: "ok",
							version: "1.0",
							generatedAt: Date.now()
						}
					}
				}
			}).catch(error => {
				if (error === constants.symbols.NOT_FOUND) {
					return {
						statusCode: 400,
						contentType: "application/json",
						content: {
							status: "fail",
							version: "1.0",
							generatedAt: Date.now(),
							message: "That user does not exist.",
							identifier: "USER_DOES_NOT_EXIST"
						}
					}
				} else {
					return {
						statusCode: 500,
						contentType: "application/json",
						content: {
							status: "fail",
							version: "1.0",
							generatedAt: Date.now(),
							message: "An unknown server error occurred.",
							identifier: "UNKNOWN_ERROR"
						}
					}
				}
			})
		}
	},
	{
		route: `/api/user_available_stream/v1/(${constants.external.username_regex})`, methods: ["GET"], code: async ({fill}) => {
			const username = fill[0]
			const waiter = new Waiter(username)
			return {
				statusCode: 200,
				contentType: "text/event-stream",
				headers: {
					"X-Accel-Buffering": "no"
				},
				stream: waiter.stream
			}
		}
	},
	{
		route: `/u/(${constants.external.username_regex})/unblock.sh`, methods: ["GET"], code: async ({fill}) => {
			const username = fill[0]
			let script = await fs.readFile(__dirname+"/utils/unblock.sh", "utf8")
			script = script.replace(/<website_origin>/g, constants.website_origin)
			script = script.replace(/<username>/g, username)
			return {
				statusCode: 200,
				contentType: "text/plain",
				content: script
			}
		}
	}
]
