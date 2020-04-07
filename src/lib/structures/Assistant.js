const {request} = require("../utils/request")
const constants = require("../constants")

class Assistant {
	constructor(origin) {
		this.origin = origin
		this.lastRequest = 0
		this.lastRequestStatus = constants.symbols.assistant_statuses.NONE
	}

	available() {
		if (this.lastRequestStatus === constants.symbols.assistant_statuses.OFFLINE) {
			return Date.now() - this.lastRequest > constants.assistant.offline_request_cooldown
		} else if (this.lastRequestStatus === constants.symbols.assistant_statuses.BLOCKED) {
			return Date.now() - this.lastRequest > constants.assistant.blocked_request_cooldown
		} else {
			return true
		}
	}

	requestUser(username) {
		this.lastRequest = Date.now()
		return new Promise((resolve, reject) => {
			request(`${this.origin}/api/user/v1/${username}`).json().then(root => {
				// console.log(root)
				if (root.status === "ok") {
					this.lastRequestStatus = constants.symbols.assistant_statuses.OK
					resolve(root.data.user)
				} else {
					this.lastRequestStatus = constants.symbols.assistant_statuses.BLOCKED
					reject(constants.symbols.assistant_statuses.BLOCKED)
				}
			}).catch(error => {
				// console.error(error)
				this.lastRequestStatus = constants.symbols.assistant_statuses.OFFLINE
				reject(constants.symbols.assistant_statuses.OFFLINE)
			})
		})
	}
}

module.exports = Assistant
