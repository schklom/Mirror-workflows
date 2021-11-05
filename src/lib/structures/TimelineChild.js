const constants = require("../constants")
const collectors = require("../collectors")
const TimelineBaseMethods = require("./TimelineBaseMethods")
const {compile} = require("pug")
require("../testimports")(collectors)

const rssImageTemplate = compile(`
img(src=constants.website_origin+entry.getDisplayUrlP() alt=entry.getAlt() width=entry.data.dimensions && entry.data.dimensions.width height=entry.data.dimensions && entry.data.dimensions.height)
`)
const rssVideoTemplate = compile(`
video(src=constants.website_origin+entry.getVideoUrlP() controls preload="auto" width=entry.data.dimensions && entry.data.dimensions.width height=entry.data.dimensions && entry.data.dimensions.height)
`)

class TimelineChild extends TimelineBaseMethods {
	/**
	 * @param {import("../types").GraphChildAll} data
	 */
	constructor(data) {
		super()
		this.data = data
	}

	getFeedItem() {
		if (this.data.video_url) {
			return rssVideoTemplate({entry: this, constants})
		} else {
			return rssImageTemplate({entry: this, constants})
		}
	}
}

module.exports = TimelineChild
