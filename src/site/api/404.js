const {render} = require("pinski/plugins")
const constants = require("../../lib/constants")

module.exports = [
	{route: "/404", methods: ["GET", "POST", "PATCH", "DELETE"], code: async ({url}) => {
		const path = url.searchParams.get("pathname")
		const couldBeUsername = path.match(`^/${constants.external.username_regex}$`)
		return render(404, "pug/404.pug", {path, couldBeUsername})
	}}
]
