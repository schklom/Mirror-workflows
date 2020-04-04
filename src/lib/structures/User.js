const constants = require("../constants")
const {proxyProfilePic} = require("../utils/proxyurl")
const {structure} = require("../utils/structuretext")
const Timeline = require("./Timeline")
require("../testimports")(constants, Timeline)

class User {
	/**
	 * @param {import("../types").GraphUser} data
	 */
	constructor(data) {
		this.data = data
		this.following = data.edge_follow.count
		this.followedBy = data.edge_followed_by.count
		this.posts = data.edge_owner_to_timeline_media.count
		this.timeline = new Timeline(this)
		this.cachedAt = Date.now()
		this.computeProxyProfilePic()
	}

	computeProxyProfilePic() {
		this.proxyProfilePicture = proxyProfilePic(this.data.profile_pic_url, this.data.id)
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

module.exports = User
