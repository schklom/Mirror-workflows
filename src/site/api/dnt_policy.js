const fs = require("fs")
const pj = require("path").join
const {render} = require("pinski/plugins")
const constants = require("../../lib/constants")

module.exports = [
	{route: "/\\.well-known/dnt-policy\\.txt", methods: ["GET"], code: async () => {
		if (constants.does_not_track) {
			return {
				statusCode: 200,
				contentType: "text/plain",
				stream: fs.createReadStream(pj(__dirname, "../html/.well-known/dnt-policy.txt"))
			}
		} else {
			return render(404, "pug/404.pug")
		}
	}}
]
