const {render} = require("pinski/plugins")
const constants = require("../../lib/constants")

module.exports = [
	{route: "/404", methods: ["*"], code: async ({url}) => {
		const path = url.searchParams.get("pathname")
		const couldBeUsername = path && path.match(`^/${constants.external.username_regex}(?:/channel)?$`)
		return render(404, "pug/404.pug", {path, couldBeUsername})
	}}
]
