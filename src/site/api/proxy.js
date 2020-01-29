const constants = require("../../lib/constants")
const {request} = require("../../lib/utils/request")
const {proxy} = require("pinski/plugins")
const sharp = require("sharp")

module.exports = [
	{route: "/imageproxy", methods: ["GET"], code: async (input) => {
		/** @type {URL} */
		// check url param exists
		const completeURL = input.url
		const params = completeURL.searchParams
		if (!params.get("url")) return [400, "Must supply `url` query parameter"]
		try {
			var url = new URL(params.get("url"))
		} catch (e) {
			return [400, "`url` query parameter is not a valid URL"]
		}
		// check url protocol
		if (url.protocol !== "https:") return [400, "URL protocol must be `https:`"]
		// check url host
		if (!["fbcdn.net", "cdninstagram.com"].some(host => url.host.endsWith(host))) return [400, "URL host is not allowed"]
		if (!["png", "jpg"].some(ext => url.pathname.endsWith(ext))) return [400, "URL extension is not allowed"]
		const width = +params.get("width")
		if (typeof width === "number" && !isNaN(width) && width > 0) {
			/*
				This uses sharp to force crop the image to a square.
				"entropy" seems to currently work better than "attention" on the thumbnail of this shortcode: B55yH20gSl0
				Some thumbnails aren't square and would otherwise be stretched on the page without this.
				If I cropped the images client side, it would have to be done with CSS background-image, which means no <img srcset>.
			*/
			return request(url).then(res => {
				const converter = sharp().resize(width, width, {position: "entropy"})
				return {
					statusCode: 200,
					contentType: "image/jpeg",
					headers: {
						"Cache-Control": constants.caching.image_cache_control
					},
					stream: res.body.pipe(converter)
				}
			})
		} else {
			// No specific size was requested, so just stream proxy the file directly.
			return proxy(url, {
				"Cache-Control": constants.caching.image_cache_control
			})
		}
	}}
]
