const constants = require("../constants")
const {proxyImage} = require("../utils/proxyurl")
const Timeline = require("./Timeline")
require("../testimports")(constants, Timeline)

class ReelUser {
	/**
	 * @param {import("../types").GraphUser} data
	 */
	constructor(data) {
		this.data = data
		this.fromReel = true
		this.following = 0
		this.followedBy = 0
		this.posts = 0
		this.timeline = new Timeline(this)
		this.cachedAt = Date.now()
		this.proxyProfilePicture = proxyImage(this.data.profile_pic_url)
	}

	getTtl(scale = 1) {
		const expiresAt = this.cachedAt + constants.caching.resource_cache_time
		const ttl = expiresAt - Date.now()
		return Math.ceil(Math.max(ttl, 0) / scale)
	}

	export() {
		return this.data
	}
}

module.exports = ReelUser
