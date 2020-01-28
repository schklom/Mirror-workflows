/*
	Welcome to the constants file!
	Copy a key and provide a new value in /config.js to override the value here.
	Please read the comments above every section!
*/

let constants = {
	// Things that server owners _should_ change!
	website_origin: "http://localhost:10407",

	// Things that server owners _could_ change if they want to.
	caching: {
		image_cache_control: `public, max-age=${7*24*60*60}`,
		resource_cache_time: 30*60*1000,
		instance_list_cache_time: 3*60*1000
	},

	// Instagram uses this stuff. This shouldn't be changed, except to fix a bug that hasn't yet been fixed upstream.
	external: {
		timeline_query_hash: "e769aa130647d2354c40ea6a439bfc08",
		shortcode_query_hash: "2b0673e0dc4580674a88d426fe00ea90",
		timeline_fetch_first: 12,
		username_regex: "[\\w.]+",
		shortcode_regex: "[\\w-]+"
	},

	resources: {
		instances_wiki_raw: "https://raw.githubusercontent.com/wiki/cloudrac3r/bibliogram/Instances.md"
	},

	// My code uses this stuff. Server owners have no reason to change it.
	symbols: {
		NO_MORE_PAGES: Symbol("NO_MORE_PAGES"),
		TYPE_IMAGE: Symbol("TYPE_IMAGE"),
		TYPE_VIDEO: Symbol("TYPE_VIDEO"),
		TYPE_GALLERY: Symbol("TYPE_GALLERY"),
		TYPE_GALLERY_IMAGE: Symbol("TYPE_GALLERY_IMAGE"),
		TYPE_GALLERY_VIDEO: Symbol("TYPE_GALLERY_VIDEO"),
		NOT_FOUND: Symbol("NOT_FOUND"),
		NO_SHARED_DATA: Symbol("NO_SHARED_DATA")
	}
}

// Override values from config and export the result
const md = require("mixin-deep")
const config = require("../../config")
constants = md(constants, config)
module.exports = constants
