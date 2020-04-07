const constants = require("../../lib/constants")
const collectors = require("../../lib/collectors")
const db = require("../../lib/db")

function reply(statusCode, content) {
	return {
		statusCode: statusCode,
		contentType: "application/json",
		content: JSON.stringify(content)
	}
}

module.exports = [
	{
		route: `/api/user`, methods: ["GET"], code: () => {
			return Promise.resolve(reply(200, {
				status: "ok",
				generatedAt: Date.now(),
				availableVersions: ["1"]
			}))
		}
	},
	{
		route: `/api/user/v1/(${constants.external.username_regex})`, methods: ["GET"], code: async ({fill, url}) => {
			function replyWithUserData(userData, type) {
				return reply(200, {
					status: "ok",
					version: "1.0",
					generatedAt: Date.now(),
					data: {
						type,
						allow_user_from_reel: constants.allow_user_from_reel,
						user: userData
					}
				})
			}

			const username = fill[0]
			const saved = db.prepare("SELECT username, user_id, updated_version, biography, post_count, following_count, followed_by_count, external_url, full_name, is_private, is_verified, profile_pic_url FROM Users WHERE username = ?").get(username)
			if (saved && saved.updated_version >= 2) { // suitable data is already saved
				delete saved.updated_version
				return Promise.resolve(replyWithUserData(saved, "user"))
			} else {
				return collectors.fetchUser(username, false).then(user => {
					const type = user.constructor.name === "User" ? "user" : "reel"
					return replyWithUserData({
						username: user.data.username,
						user_id: user.data.id,
						biography: user.data.biography,
						post_count: user.posts,
						following_count: user.following,
						followed_by_count: user.followedBy,
						external_url: user.data.external_url,
						full_name: user.data.full_name,
						is_private: user.data.is_private,
						is_verified: user.data.is_verified,
						profile_pic_url: user.data.profile_pic_url
					}, type)
				}).catch(error => {
					if (error === constants.symbols.RATE_LIMITED || error === constants.symbols.INSTAGRAM_DEMANDS_LOGIN) {
						return reply(503, {
							status: "fail",
							version: "1.0",
							generatedAt: Date.now(),
							message: "Rate limited by Instagram.",
							identifier: "RATE_LIMITED"
						})
					} else {
						throw error
					}
				})
			}
		}
	}
]
