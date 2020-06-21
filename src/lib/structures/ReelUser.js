const constants = require("../constants")
const Timeline = require("./Timeline")
const BaseUser = require("./BaseUser")
require("../testimports")(constants, Timeline, BaseUser)

class ReelUser extends BaseUser {
	constructor(data) {
		super()
		/** @type {import("../types").GraphUser} */
		this.data = data
		this.fromReel = true
		this.posts = 0
		this.following = data.edge_follow ? data.edge_follow.count : 0
		this.followedBy = data.edge_followed_by ? data.edge_followed_by.count : 0
		/** @type {import("./Timeline")} */
		this.timeline = new Timeline(this)
		this.cachedAt = Date.now()
		this.computeProxyProfilePic()
	}
}

module.exports = ReelUser
