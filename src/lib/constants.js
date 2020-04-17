/*
	Welcome to the constants file!
	Copy a key and provide a new value in /config.js to override the value here.
	Please read the comments above every section!
*/

let constants = {
	// Things that server owners _should_ change!
	// Protocol and domain that the website can be accessed on. Images and links in RSS feeds start with this URL.
	// Do NOT include a trailing slash. If you leave this as localhost, Bibliogram will not work correctly when accessed from any other device.
	// If you are using nginx to make Bibliogram accessible on port 80/443, do NOT write a port here.
	// For example, "https://bibliogram.art"
	website_origin: "http://localhost:10407",
	// IP address to bind to.
	// "0.0.0.0" will make the server reachable on all IPv4 interfaces.
	// "::" will make the server reachable on all IPv6 interfaces, and maybe also IPv4. (https://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback)
	// If you run nginx, you must change the nginx config instead.
	bind_ip: "0.0.0.0",
	// Port to actually run the webserver on.
	port: 10407,
	// You MUST read /src/site/pug/privacy.pug.template before changing has_privacy_policy!
	has_privacy_policy: false,

	// Things that server owners _could_ change if they want to.
	tor: {
		enabled: false, // If false, everything else in this block has no effect.
		password: null, // If `null`, Bibliogram will run its own Tor process instead.
		for: {
			user_html: false, // User HTML page seems to have less forgiving rates, and Tor always fails, so it's disabled by default.
			timeline_graphql: true,
			post_graphql: true,
			reel_graphql: true
		}
	},
	request_backend: "node-fetch", // one of: "node-fetch", "got"
	// After setting your privacy policy, I suggest you read src/site/html/.well-known/dnt-policy.txt. If you comply with it,
	// change this to `true` to serve it, which will make extensions like Privacy Badger automatically whitelist the domain.
	does_not_track: false,

	allow_user_from_reel: "preferForRSS", // one of: "never", "fallback", "prefer", "onlyPreferSaved", "preferForRSS"

	settings: {
		rss_enabled: true,
		display_feed_validation_buttons: false,
		enable_updater_page: false
	},

	use_assistant: {
		enabled: false,
		// Read the docs.
		assistants: [
		],
		offline_request_cooldown: 20*60*1000,
		blocked_request_cooldown: 2*60*60*1000,
	},

	as_assistant: {
		enabled: false, // You can still start just the assistant with npm run assistant.
		require_key: false,
		// List of keys that are allowed access. You can use any string.
		// Try `crypto.randomBytes(20).toString("hex")` to get some randomness.
		keys: []
	},

	caching: {
		image_cache_control: `public, max-age=${7*24*60*60}`,
		resource_cache_time: 30*60*1000,
		instance_list_cache_time: 3*60*1000,
		updater_cache_time: 2*60*1000,
		cache_sweep_interval: 3*60*1000,
		self_blocked_status: {
			enabled: false,
			time: 2*60*60*1000,
		},
		db_user_id: true,
		db_post_n3: true,
		db_request_history: false
	},

	// Instagram uses this stuff. This shouldn't be changed, except to fix a bug that hasn't yet been fixed upstream.
	external: {
		reel_query_hash: "c9100bf9110dd6361671f113dd02e7d6",
		timeline_query_hash: "e769aa130647d2354c40ea6a439bfc08",
		timeline_query_hash_2: "42323d64886122307be10013ad2dcc44", // https://github.com/rarcega/instagram-scraper/blob/dc022081dbefc81500c5f70cce5c70cfd2816e3c/instagram_scraper/constants.py#L30
		shortcode_query_hash: "2b0673e0dc4580674a88d426fe00ea90",
		timeline_fetch_first: 12,
		username_regex: "[\\w.]*[\\w]",
		shortcode_regex: "[\\w-]+",
		hashtag_regex: "[^ \\n`~!@#\\$%^&*()\\-=+[\\]{};:\"',<.>/?\\\\]+",
		reserved_paths: [ // https://github.com/cloudrac3r/bibliogram/wiki/Reserved-URLs
			// Redirects
			"about", "explore", "support", "press", "api", "privacy", "safety", "admin",
			// Content
			"embed.js",
			// Not found, but likely reserved
			"graphql", "accounts", "p", "help", "terms", "contact", "blog", "igtv"
		]
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
		INSTAGRAM_DEMANDS_LOGIN: Symbol("INSTAGRAM_DEMANDS_LOGIN"),
		RATE_LIMITED: Symbol("RATE_LIMITED"),
		ENDPOINT_OVERRIDDEN: Symbol("ENDPOINT_OVERRIDDEN"),
		NO_ASSISTANTS_AVAILABLE: Symbol("NO_ASSISTANTS_AVAILABLE"),
		extractor_results: {
			SUCCESS: Symbol("SUCCESS"),
			AGE_RESTRICTED: Symbol("AGE_RESTRICTED"),
			NO_SHARED_DATA: Symbol("NO_SHARED_DATA")
		},
		assistant_statuses: {
			OFFLINE: Symbol("OFFLINE"),
			BLOCKED: Symbol("BLOCKED"),
			OK: Symbol("OK"),
			NONE: Symbol("NONE"),
			NOT_AUTHENTICATED: Symbol("NOT_AUTHENTICATED")
		},
		fetch_context: {
			RSS: Symbol("RSS"),
			ASSISTANT: Symbol("ASSISTANT")
		}
	},

	database_version: 3
}

// Override values from config and export the result
const md = require("mixin-deep")
if (process.env.BIBLIOGRAM_CONFIG) { // presence of environment variable BIBLIOGRAM_CONFIG overrides /config.js
	const config = JSON.parse(process.env.BIBLIOGRAM_CONFIG)
	constants = md(constants, config)
} else {
	const config = require("../../config")
	constants = md(constants, config)
}
module.exports = constants
