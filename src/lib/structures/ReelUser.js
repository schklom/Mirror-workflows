const constants = require("../constants")
const {proxyImage} = require("../utils/proxyurl")
const {structure} = require("../utils/structuretext")
const Timeline = require("./Timeline")
require("../testimports")(constants, Timeline)

class ReelUser {
	constructor(data) {
		/** @type {import("../types").GraphUser} */
		this.data = data
		this.fromReel = true
		this.posts = 0
		this.following = data.edge_follow ? data.edge_follow.count : 0
		this.followedBy = data.edge_followed_by ? data.edge_followed_by.count : 0
		/** @type {import("./Timeline")} */
		this.timeline = new Timeline(this)
		this.cachedAt = Date.now()
		this.proxyProfilePicture = proxyImage(this.data.profile_pic_url)
	}

	getStructuredBio() {
		if (!this.data.biography) return null
		return structure(this.data.biography)
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
