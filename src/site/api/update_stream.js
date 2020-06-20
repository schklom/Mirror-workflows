const {Readable} = require("stream")

const streams = new Set()

setInterval((new (function() {
	const payload = `:keepalive ${Date.now()}\n\n`
	for (const stream of streams.values()) {
		stream.push(payload)
	}
})).constructor, 50000).unref()

module.exports = [
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
