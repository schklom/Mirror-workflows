const {request} = require("../utils/request")
const constants = require("../constants")

class Assistant {
	constructor(origin, key) {
		this.origin = origin
		this.key = key
		this.lastRequest = 0
		this.lastRequestStatus = constants.symbols.assistant_statuses.NONE
	}

	available() {
		if (this.lastRequestStatus === constants.symbols.assistant_statuses.OFFLINE) {
			return Date.now() - this.lastRequest > constants.use_assistant.offline_request_cooldown
		} else if (this.lastRequestStatus === constants.symbols.assistant_statuses.BLOCKED) {
			return Date.now() - this.lastRequest > constants.use_assistant.blocked_request_cooldown
		} else if (this.lastRequestStatus === constants.symbols.assistant_statuses.NOT_AUTHENTICATED) {
			return false
		} else {
			return true
		}
	}

	requestUser(username) {
		this.lastRequest = Date.now()
		return new Promise((resolve, reject) => {
			const url = new URL(`${this.origin}/api/user/v1/${username}`)
			if (this.key !== null) url.searchParams.append("key", this.key)
			request(url.toString()).json().then(root => {
				// console.log(root)
				if (root.status === "ok") {
					this.lastRequestStatus = constants.symbols.assistant_statuses.OK
					resolve(root.data.user)
				} else { // "fail"
					if (root.identifier === "NOT_FOUND") {
						this.lastRequestStatus = constants.symbols.assistant_statuses.OK
						reject(constants.symbols.NOT_FOUND)
					} else if (root.identifier === "AGE_RESTRICTED") {
						this.lastRequestStatus = constants.symbols.assistant_statuses.OK
						reject(constants.symbols.extractor_results.AGE_RESTRICTED)
					} else if (root.identifier === "NOT_AUTHENTICATED") {
						this.lastRequestStatus = constants.symbols.assistant_statuses.NOT_AUTHENTICATED
						reject(constants.symbols.assistant_statuses.NOT_AUTHENTICATED)
					} else { // blocked
						this.lastRequestStatus = constants.symbols.assistant_statuses.BLOCKED
						reject(constants.symbols.assistant_statuses.BLOCKED)
					}
				}
			}).catch(error => {
				// this catches network errors, parse errors, and property access errors.
				// all of these mean that the user API didn't behave in an expected manner, probably because the server is doing something else
				// console.error(error)
				this.lastRequestStatus = constants.symbols.assistant_statuses.OFFLINE
				reject(constants.symbols.assistant_statuses.OFFLINE)
			})
		})
	}
}

module.exports = Assistant
