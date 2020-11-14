const constants = require("../../lib/constants")
const lang = require("../../lang")
const {render, redirect} = require("pinski/plugins")
const {getSettings, getToken, generateCSRF, checkCSRF} = require("./utils/getsettings")
const {getSettingsReferrer} = require("./utils/settingsreferrer")
const crypto = require("crypto")
const db = require("../../lib/db")

module.exports = [
	{
		route: "/settings", methods: ["GET"], code: async ({req, url}) => {
			const token = getToken(req)
			const settings = getSettings(req)
			// console.log(settings)
			const csrf = generateCSRF()
			const message = url.searchParams.get("message")
			const status = url.searchParams.get("status")
			return render(200, "pug/settings.pug", {
				stayAction: getSettingsReferrer(url.searchParams.get("referrer"), "/settings/stay"),
				returnAction: getSettingsReferrer(url.searchParams.get("referrer"), "/settings/return"),
				returnURL: url.searchParams.get("referrer") || "/",
				constants,
				settings,
				token,
				csrf,
				status,
				message
			})
		}
	},
	{
		route: "/settings/(stay|return)", methods: ["POST"], upload: true, code: async ({req, body, fill, url}) => {
			const action = fill[0]
			const token = getToken(req)
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
			if (token) {
				prepared.token = token
			} else {
				const checkPrepared = db.prepare("SELECT token FROM UserSettings WHERE token = ?")
				do {
					prepared.token = crypto.randomBytes(16).toString("hex")
				} while (checkPrepared.get(prepared.token))
			}
			prepared.created = Date.now()
			const fields = constants.user_settings.map(s => s.name)
			db.prepare(`REPLACE INTO UserSettings (token, created, ${fields.join(", ")}) VALUES (@token, @created, ${fields.map(f => "@"+f).join(", ")})`).run(prepared)
			const expires = new Date(Date.now() + 4000*24*60*60*1000).toUTCString()
			let location
			if (action === "return" && url.searchParams.has("referrer")) {
				location = url.searchParams.get("referrer")
			} else { // stay
				const ll = lang.get(prepared.language)
				const newParams = new URLSearchParams()
				newParams.append("status", "success")
				newParams.append("message", ll.settings_saved)
				if (url.searchParams.has("referrer")) {
					newParams.append("referrer", url.searchParams.get("referrer"))
				}
				location = "/settings?" + newParams.toString()
			}
			return {
				statusCode: 303,
				headers: {
					"Location": location,
					"Set-Cookie": `settings=${prepared.token}; Path=/; Expires=${expires}; SameSite=Lax`
				},
				contentType: "text/html; charset=UTF-8",
				content: "Redirecting..."
			}
		}
	},
	{
		route: "/applysettings/([0-9a-f]+)", methods: ["GET"], code: async ({fill}) => {
			const expires = new Date(Date.now() + 4000*24*60*60*1000).toUTCString()
			return {
				statusCode: 302,
				headers: {
					"Location": "/",
					"Set-Cookie": `settings=${fill[0]}; Path=/; Expires=${expires}; SameSite=Lax`
				},
				contentType: "text/html; charset=UTF-8",
				content: "Settings restored. Redirecting..."
			}
		}
	}
]
