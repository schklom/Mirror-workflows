const constants = require("./constants")
const {request} = require("./utils/request")
const {extractSharedData} = require("./utils/body")
const {TtlCache, RequestCache} = require("./cache")
const RequestHistory = require("./structures/RequestHistory")
require("./testimports")(constants, request, extractSharedData, RequestCache, RequestHistory)

const requestCache = new RequestCache(constants.caching.resource_cache_time)
/** @type {import("./cache").TtlCache<import("./structures/TimelineEntry")>} */
const timelineEntryCache = new TtlCache(constants.caching.resource_cache_time)
const history = new RequestHistory(["user", "timeline", "post"])

function fetchUser(username) {
	return requestCache.getOrFetch("user/"+username, () => {
		return request(`https://www.instagram.com/${username}/`).then(res => {
			if (res.status === 302) {
				history.report("user", false)
				throw constants.symbols.INSTAGRAM_DEMANDS_LOGIN
			} else if (res.status === 404) {
				throw constants.symbols.NOT_FOUND
			} else return res.text().then(text => {
				// require down here or have to deal with require loop. require cache will take care of it anyway.
				// User -> Timeline -> TimelineImage -> collectors -/> User
				const User = require("./structures/User")
				const sharedData = extractSharedData(text)
				const user = new User(sharedData.entry_data.ProfilePage[0].graphql.user)
				history.report("user", true)
				return user
			})
		})
	})
}

/**
 * @param {string} userID
 * @param {string} after
 * @returns {Promise<import("./types").PagedEdges<import("./types").TimelineEntryN2>>}
 */
function fetchTimelinePage(userID, after) {
	const p = new URLSearchParams()
	p.set("query_hash", constants.external.timeline_query_hash)
	p.set("variables", JSON.stringify({
		id: userID,
		first: constants.external.timeline_fetch_first,
		after: after
	}))
	return requestCache.getOrFetchPromise("page/"+after, () => {
		return request(`https://www.instagram.com/graphql/query/?${p.toString()}`).then(res => res.json()).then(root => {
			if (!root.data) {
				history.report("timeline", false)
				console.error("missing data from timeline request, 429?", root) //todo: please make this better.
				throw new Error("missing data from timeline request, 429?")
			} else {
				/** @type {import("./types").PagedEdges<import("./types").TimelineEntryN2>} */
				const timeline = root.data.user.edge_owner_to_timeline_media
				history.report("timeline", true)
				return timeline
			}
		})
	})
}

/**
 * @param {string} shortcode
 * @returns {import("./structures/TimelineEntry")}
 */
function getOrCreateShortcode(shortcode) {
	if (timelineEntryCache.has(shortcode)) {
		return timelineEntryCache.get(shortcode)
	} else {
		// require down here or have to deal with require loop. require cache will take care of it anyway.
		// TimelineImage -> collectors -/> TimelineImage
		const TimelineEntry = require("./structures/TimelineEntry")
		const result = new TimelineEntry()
		timelineEntryCache.set(shortcode, result)
		return result
	}
}

async function getOrFetchShortcode(shortcode) {
	if (timelineEntryCache.has(shortcode)) {
		return timelineEntryCache.get(shortcode)
	} else {
		const data = await fetchShortcodeData(shortcode)
		const entry = getOrCreateShortcode(shortcode)
		entry.applyN3(data)
		return entry
	}
}

/**
 * @param {string} shortcode
 * @returns {Promise<import("./types").TimelineEntryN3>}
 */
function fetchShortcodeData(shortcode) {
	// example actual query from web:
	// query_hash=2b0673e0dc4580674a88d426fe00ea90&variables={"shortcode":"xxxxxxxxxxx","child_comment_count":3,"fetch_comment_count":40,"parent_comment_count":24,"has_threaded_comments":true}
	// we will not include params about comments, which means we will not receive comments, but everything else should still work fine
	const p = new URLSearchParams()
	p.set("query_hash", constants.external.shortcode_query_hash)
	p.set("variables", JSON.stringify({shortcode}))
	return requestCache.getOrFetchPromise("shortcode/"+shortcode, () => {
		return request(`https://www.instagram.com/graphql/query/?${p.toString()}`).then(res => res.json()).then(root => {
			if (!root.data) {
				history.report("post", false)
				console.error("missing data from post request, 429?", root) //todo: please make this better.
				throw new Error("missing data from post request, 429?")
			/** @type {import("./types").TimelineEntryN3} */
			} else {
				const data = root.data.shortcode_media
				if (data == null) {
					// the thing doesn't exist
					throw constants.symbols.NOT_FOUND
				} else {
					history.report("post", true)
					return data
				}
			}
		})
	})
}

module.exports.fetchUser = fetchUser
module.exports.fetchTimelinePage = fetchTimelinePage
module.exports.getOrCreateShortcode = getOrCreateShortcode
module.exports.fetchShortcodeData = fetchShortcodeData
module.exports.requestCache = requestCache
module.exports.timelineEntryCache = timelineEntryCache
module.exports.getOrFetchShortcode = getOrFetchShortcode
module.exports.history = history
