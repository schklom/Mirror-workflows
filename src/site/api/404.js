const {render} = require("pinski/plugins")
const constants = require("../../lib/constants")
const {getSettings} = require("./utils/getsettings")

module.exports = [
	{route: "/404", methods: ["*"], code: async ({req, url}) => {
		const path = url.searchParams.get("pathname")
		const couldBeUsername = path && path.match(`^/${constants.external.username_regex}(?:/channel)?$`)
		const settings = getSettings(req)
		return render(404, "pug/404.pug", {settings, path, couldBeUsername})
	}}
]
