const constants = require("../../lib/constants")
const {render, redirect} = require("pinski/plugins")
const {getSettings, getToken, generateCSRF, checkCSRF} = require("./utils/getsettings")
const crypto = require("crypto")
const db = require("../../lib/db")

module.exports = [
	{
		route: "/settings", methods: ["GET"], code: async ({req, url}) => {
			const settings = getSettings(req)
			// console.log(settings)
			const csrf = generateCSRF()
			const message = url.searchParams.get("message")
			const status = url.searchParams.get("status")
			return render(200, "pug/settings.pug", {constants, settings, csrf, status, message})
		}
	},
	{
		route: "/settings", methods: ["POST"], upload: true, code: async ({req, body}) => {
			const oldToken = getToken(req)
			const params = new URLSearchParams(body.toString())
			if (!checkCSRF(params.get("csrf"))) {
				const returnParams = new URLSearchParams()
				returnParams.append("status", "fail")
				returnParams.append("message", "Form timed out or reused.\n(Invalid or missing CSRF token.)")
				return redirect("/settings?" + returnParams.toString(), 303)
			}
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
			db.prepare("DELETE FROM UserSettings WHERE token = ?").run(oldToken)
			const expires = new Date(Date.now() + 4000*24*60*60*1000).toUTCString()
			return {
				statusCode: 303,
				headers: {
					"Location": "/settings?status=success&message=Saved.",
					"Set-Cookie": `settings=${prepared.token}; Path=/; Expires=${expires}; SameSite=Lax`
				},
				contentType: "text/html; charset=UTF-8",
				content: "Redirecting..."
			}
		}
	}
]
