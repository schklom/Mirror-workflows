const config = require("../../../config")
const {proxyImage} = require("../utils/proxyurl")
const collectors = require("../collectors")
const TimelineBaseMethods = require("./TimelineBaseMethods")
require("../testimports")(collectors)

class TimelineChild extends TimelineBaseMethods {
	/**
	 * @param {import("../types").GraphChildAll} data
	 */
	constructor(data) {
		super()
		this.data = data
	}
}

module.exports = TimelineChild
