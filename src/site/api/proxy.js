const constants = require("../../lib/constants")
const {request} = require("../../lib/utils/request")
const {proxy} = require("pinski/plugins")
const sharp = require("sharp")

const VERIFY_SUCCESS = Symbol("VERIFY_SUCCESS")

/**
 * Check that a resource is on Instagram.
 * @param {URL} completeURL
 */
function verifyURL(completeURL) {
	const params = completeURL.searchParams
	if (!params.get("url")) return {status: "fail", value: [400, "Must supply `url` query parameter"]}
	try {
		var url = new URL(params.get("url"))
	} catch (e) {
		return {status: "fail", value: [400, "`url` query parameter is not a valid URL"]}
	}
	// check url protocol
	if (url.protocol !== "https:") return {status: "fail", value: [400, "URL protocol must be `https:`"]}
	// check url host
	if (!["fbcdn.net", "cdninstagram.com"].some(host => url.host.endsWith(host))) return {status: "fail", value: [400, "URL host is not allowed"]}
	return {status: "ok", url}
}
module.exports = [
	{
		route: "/imageproxy", methods: ["GET"], code: async (input) => {
			const verifyResult = verifyURL(input.url)
			if (verifyResult.status !== "ok") return verifyResult.value
			if (!["png", "jpg"].some(ext => verifyResult.url.pathname.endsWith(ext))) return [400, "URL extension is not allowed"]
			const params = input.url.searchParams
			const width = +params.get("width")
			if (typeof width === "number" && !isNaN(width) && width > 0) {
				/*
					This uses sharp to force crop the image to a square.
					"entropy" seems to currently work better than "attention" on the thumbnail of this shortcode: B55yH20gSl0
					Some thumbnails aren't square and would otherwise be stretched on the page without this.
					If I cropped the images client side, it would have to be done with CSS background-image, which means no <img srcset>.
				*/
				return request(verifyResult.url).then(res => {
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
				return proxy(verifyResult.url, {
					"Cache-Control": constants.caching.image_cache_control
				})
			}
		}
	},
	{
		route: "/videoproxy", methods: ["GET"], code: async (input) => {
			const verifyResult = verifyURL(input.url)
			if (verifyResult.status !== "ok") return verifyResult.value
			const url = verifyResult.url
			if (!["mp4"].some(ext => url.pathname.endsWith(ext))) return [400, "URL extension is not allowed"]
			return proxy(url, {
				"Cache-Control": constants.caching.image_cache_control
			})
		}
	}
]
