const constants = require("../constants")
const {proxyImage, proxyExtendedOwner} = require("../utils/proxyurl")

class TimelineBaseMethods {
	constructor() {
		/** @type {import("../types").GraphChildAll & {owner?: any}} */
		this.data
	}

	getType() {
		if (this.data.__typename === "GraphImage") {
			if (this.data.owner) return constants.symbols.TYPE_IMAGE
			else return constants.symbols.TYPE_GALLERY_IMAGE
		} else if (this.data.__typename === "GraphVideo") {
			if (this.data.owner) return constants.symbols.TYPE_VIDEO
			else return constants.symbols.TYPE_GALLERY_VIDEO
		} else if (this.data.__typename === "GraphSidecar") {
			return constants.symbols.TYPE_GALLERY
		} else {
			throw new Error("Unknown shortcode __typename: "+this.data.__typename)
		}
	}

	getDisplayUrlP() {
		return proxyImage(this.data.display_url)
	}

	getAlt() {
		return this.data.accessibility_caption || "No image description available."
	}
}

module.exports = TimelineBaseMethods
