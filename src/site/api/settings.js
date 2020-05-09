const constants = require("../../lib/constants")
const {render, redirect} = require("pinski/plugins")
const {getSettings} = require("./utils/getsettings")
const crypto = require("crypto")
const db = require("../../lib/db")

module.exports = [
	{
		route: "/settings", methods: ["GET"], code: async ({req, url}) => {
			const settings = getSettings(req)
			// console.log(settings)
			const saved = url.searchParams.has("saved")
			return render(200, "pug/settings.pug", {saved, constants, settings})
		}
	},
	{
		route: "/settings", methods: ["POST"], upload: true, code: async ({body}) => {
			const params = new URLSearchParams(body.toString())
			const prepared = {}
			for (const setting of constants.user_settings) {
				let valueOrDefault
				if (params.has(setting.name) && params.get(setting.name) !== "") {
					valueOrDefault = params.get(setting.name)
				} else if (setting.replaceEmptyWithDefault) {
					valueOrDefault = setting.default
				} else {
					valueOrDefault = ""
				}
				let valueCorrectType
				if (setting.boolean) {
					valueCorrectType = +(valueOrDefault !== "")
				} else {
					valueCorrectType = valueOrDefault
				}
				prepared[setting.name] = valueCorrectType
			}
			// console.log(prepared)
			const checkPrepared = db.prepare("SELECT token FROM UserSettings WHERE token = ?")
			do {
				prepared.token = crypto.randomBytes(16).toString("hex")
			} while (checkPrepared.get(prepared.token))
			prepared.created = Date.now()
			const fields = constants.user_settings.map(s => s.name)
			db.prepare(`INSERT INTO UserSettings (token, created, ${fields.join(", ")}) VALUES (@token, @created, ${fields.map(f => "@"+f).join(", ")})`).run(prepared)
			const expires = new Date(Date.now() + 4000*24*60*60*1000).toUTCString()
			return {
				statusCode: 303,
				headers: {
					"Location": "/settings?saved=1",
					"Set-Cookie": `settings=${prepared.token}; Path=/; Expires=${expires}; SameSite=Strict`
				},
				contentType: "text/html",
				content: "Redirecting..."
			}
		}
	}
]
