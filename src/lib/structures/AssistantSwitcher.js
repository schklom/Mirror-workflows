const constants = require("../constants")
const collectors = require("../collectors")
const Assistant = require("./Assistant")
const db = require("../db")

class AssistantSwitcher {
	constructor() {
		this.assistants = constants.use_assistant.assistants.map(data => new Assistant(data.origin, data.key))
	}

	enabled() {
		return constants.use_assistant.enabled && this.assistants.length
	}

	getAvailableAssistants() {
		return this.assistants.filter(assistant => assistant.available()).sort((a, b) => (a.lastRequest - b.lastRequest))
	}

	requestUser(username) {
		return new Promise(async (resolve, reject) => {
			const assistants = this.getAvailableAssistants()
			while (assistants.length) {
				const assistant = assistants.shift()
				try {
					const user = await assistant.requestUser(username)
					return resolve(user)
				} catch (e) {
					if (e === constants.symbols.NOT_FOUND) {
						const rejection = Promise.reject(e)
						rejection.catch(() => {}) // otherwise we get a warning that the rejection was handled asynchronously
						collectors.userRequestCache.set(`user/${username}`, false, rejection)
						return reject(e)
					} else if (e === constants.symbols.assistant_statuses.NOT_AUTHENTICATED) {
						// no further requests will be successful. the assistant has already marked itself as not available.
						console.error(`Assistant ${assistant.origin} refused request, not authenticated`)
					}
					// that assistant broke. try the next one.
				}
			}
			return reject(constants.symbols.NO_ASSISTANTS_AVAILABLE)
		}).then(user => {
			const bind = {...user}
			bind.created = Date.now()
			bind.updated = Date.now()
			bind.updated_version = constants.database_version
			bind.is_private = +user.is_private
			bind.is_verified = +user.is_verified
			db.prepare(
				"REPLACE INTO Users (username,  user_id,  created,  updated,  updated_version,  biography,  post_count,  following_count,  followed_by_count,  external_url,  full_name,  is_private,  is_verified,  profile_pic_url) VALUES "
									  +"(@username, @user_id, @created, @updated, @updated_version, @biography, @post_count, @following_count, @followed_by_count, @external_url, @full_name, @is_private, @is_verified, @profile_pic_url)"
			).run(bind)
			collectors.userRequestCache.cache.delete(`user/${username}`)
			return collectors.fetchUserFromSaved(user)
		})
	}
}

module.exports = AssistantSwitcher
