const constants = require("../constants")
const Timeline = require("./Timeline")
const BaseUser = require("./BaseUser")
require("../testimports")(constants, Timeline, BaseUser)

class User extends BaseUser {
	/**
	 * @param {import("../types").GraphUser} data
	 */
	constructor(data) {
		super()
		this.data = data
		this.following = data.edge_follow.count
		this.followedBy = data.edge_followed_by.count
		this.posts = data.edge_owner_to_timeline_media.count
		this.timeline = new Timeline(this, "timeline")
		this.igtv = new Timeline(this, "igtv")
		this.cachedAt = Date.now()
		this.computeProxyProfilePic()
	}
}

module.exports = User
