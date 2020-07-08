const {Readable} = require("stream")
const constants = require("../../lib/constants")
const push_webhook_token = constants.secrets.push_webhook_token

const streams = new Set()

setInterval((new (function() {
	const payload = `:keepalive ${Date.now()}\n\n`
	for (const stream of streams.values()) {
		stream.push(payload)
	}
})).constructor, 50000).unref()

module.exports = [
	{
		route: "/api/hooks/push/1.0", methods: ["POST"], code: async ({url}) => {
			if (push_webhook_token && url.searchParams.get("token") === push_webhook_token) {
				for (const stream of streams.values()) {
					stream.push(`event: push\ndata: push ${Date.now()}\n:[.] Update available!\n\n`)
				}
				return {
					statusCode: 200,
					contentType: "application/json",
					content: {
						status: "ok",
						version: "1.0",
						generatedAt: Date.now(),
						data: null
					}
				}
			} else {
				return {
					statusCode: 401,
					contentType: "application/json",
					content: {
						status: "fail",
						version: "1.0",
						generatedAt: Date.now(),
						fields: ["q:token"],
						message: "query parameter `token` is required for authentication"
					}
				}
			}
		}
	},
	{
		route: "/api/update_stream", methods: ["GET"], code: async () => {
			const stream = new Readable({
				read: function() {},
				destroy: function() {
					streams.delete(stream)
				}
			})
			streams.add(stream)
			stream.push(":connected\n\n")

			return {
				statusCode: 200,
				contentType: "text/event-stream",
				headers: {
					"X-Accel-Buffering": "no"
				},
				stream
			}
		}
	}
]
