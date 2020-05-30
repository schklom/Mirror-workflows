const sharp = require("sharp")

const constants = require("../../lib/constants")
const collectors = require("../../lib/collectors")
const {request} = require("../../lib/utils/request")
const db = require("../../lib/db")
require("../../lib/testimports")(constants, request, db)

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

function statusCodeIsAcceptable(status) {
	return (status >= 200 && status < 300) || status === 304
}

/**
 * @param {string} url
 */
async function proxyResource(url, suggestedHeaders = {}, refreshCallback = null) {
	// console.log(`Asked to proxy ${url}\n`, suggestedHeaders)
	const headersToSend = {}
	for (const key of ["accept", "accept-encoding", "accept-language", "range"]) {
		if (suggestedHeaders[key]) headersToSend[key] = suggestedHeaders[key]
	}
	const sent = request(url, {headers: headersToSend}, {log: false})
	const stream = await sent.stream()
	const response = await sent.response()
	// console.log(response.status, response.headers)
	if (statusCodeIsAcceptable(response.status)) {
		const headersToReturn = {}
		for (const key of ["content-type", "date", "last-modified", "expires", "cache-control", "accept-ranges", "content-range", "origin", "etag", "content-length", "transfer-encoding"]) {
			headersToReturn[key] = response.headers.get(key)
		}
		return {
			statusCode: response.status,
			headers: headersToReturn,
			stream: stream
		}
	} else if (refreshCallback && [410, 404, 403].includes(response.status)) { // profile picture has since changed
		return refreshCallback()
	} else {
		return {
			statusCode: 502,
			headers: {
				"Content-Type": "text/plain; charset=UTF-8"
			},
			content: `Instagram returned HTTP status ${response.status}, which is not a success code.`
		}
	}
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
				return request(verifyResult.url, {}, {log: false}).stream().then(body => {
					const converter = sharp().resize(width, width, {position: "entropy"})
					body.on("error", error => {
						console.error("Response stream emitted an error:", error)
					})
					converter.on("error", error => {
						console.error("Sharp instance emitted an error:", error)
					})
					const piped = body.pipe(converter)
					piped.on("error", error => {
						console.error("Piped stream emitted an error:", error)
					})
					return {
						statusCode: 200,
						contentType: "image/jpeg",
						headers: {
							"Cache-Control": constants.caching.image_cache_control
						},
						stream: piped
					}
				})
			} else {
				// No specific size was requested, so just stream proxy the file directly.
				if (params.has("userID")) {
					// Users get special handling, because we need to update their profile picture if an expired version is cached.
					return proxyResource(verifyResult.url.toString(), input.req.headers, () => {
						// If we get here, we got HTTP 410 GONE.
						const userID = params.get("userID")
						const storedProfilePicURL = db.prepare("SELECT profile_pic_url FROM Users WHERE user_id = ?").pluck().get(userID)
						if (storedProfilePicURL === verifyResult.url.toString()) {
							// Everything looks fine, find out what the new URL for the provided user ID is and store it.
							return collectors.updateProfilePictureFromReel(userID).then(url => {
								// Updated. Return the new picture (without recursing)
								return proxyResource(url, input.req.headers)
							}).catch(error => {
								console.error(error)
								return {
									statusCode: 500,
									headers: {
										"Content-Type": "text/plain; charset=UTF-8"
									},
									content: String(error)
								}
							})
						} else {
							// The request is a lie!
							return {
								statusCode: 400,
								headers: {
									"Content-Type": "text/plain; charset=UTF-8"
								},
								content: "Profile picture must be refreshed, but provided userID parameter does not match the stored profile_pic_url."
							}
						}
					})
				} else {
					return proxyResource(verifyResult.url.toString(), input.req.headers)
				}
			}
		}
	},
	{
		route: "/videoproxy", methods: ["GET"], code: async (input) => {
			const verifyResult = verifyURL(input.url)
			if (verifyResult.status !== "ok") return verifyResult.value
			const url = verifyResult.url
			if (!["mp4"].some(ext => url.pathname.endsWith(ext))) return [400, "URL extension is not allowed"]
			return proxyResource(url.toString(), input.req.headers)
		}
	}
]
