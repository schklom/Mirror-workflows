function proxyImage(url, width) {
	const params = new URLSearchParams()
	if (width) params.set("width", width)
	params.set("url", url)
	return "/imageproxy?"+params.toString()
}

/**
 * @param {import("../types").ExtendedOwner} owner
 */
function proxyExtendedOwner(owner) {
	const clone = {...owner}
	clone.profile_pic_url = proxyImage(clone.profile_pic_url)
	return clone
}

module.exports.proxyImage = proxyImage
module.exports.proxyExtendedOwner = proxyExtendedOwner
