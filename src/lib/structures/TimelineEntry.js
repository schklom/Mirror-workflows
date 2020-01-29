const constants = require("../constants")
const {proxyImage, proxyExtendedOwner} = require("../utils/proxyurl")
const {compile} = require("pug")
const collectors = require("../collectors")
const TimelineBaseMethods = require("./TimelineBaseMethods")
const TimelineChild = require("./TimelineChild")
require("../testimports")(collectors, TimelineChild, TimelineBaseMethods)

const rssDescriptionTemplate = compile(`
p(style='white-space: pre-line')= caption
each child in children
	img(alt=child.alt src=child.src width=child.width height=child.height)
`)

class TimelineEntry extends TimelineBaseMethods {
	constructor() {
		super()
		/** @type {import("../types").TimelineEntryAll} some properties may not be available yet! */
		// @ts-ignore
		this.data = {}
		const error = new Error("TimelineEntry data was not initalised in same event loop (missing __typename)") // initialise here for a useful stack trace
		setImmediate(() => { // next event loop
			if (!this.data.__typename) throw error
		})
		/** @type {string} Not available until fetchExtendedOwnerP is called */
		this.ownerPfpCacheP = null
		/** @type {import("./TimelineChild")[]} Not available until fetchChildren is called */
		this.children = null
	}

	async update() {
		return collectors.fetchShortcodeData(this.data.shortcode).then(data => {
			this.applyN3(data)
		}).catch(error => {
			console.error("TimelineEntry could not self-update; trying to continue anyway...")
			console.error("E:", error)
		})
	}

	/**
	 * General apply function that detects the data format
	 */
	apply(data) {
		if (!data.display_resources) {
			this.applyN1(data)
		} else if (data.thumbnail_resources) {
			this.applyN2(data)
		} else {
			this.applyN3(data)
		}
	}

	/**
	 * @param {import("../types").TimelineEntryN1} data
	 */
	applyN1(data) {
		Object.assign(this.data, data)
		this.fixData()
	}

	/**
	 * @param {import("../types").TimelineEntryN2} data
	 */
	applyN2(data) {
		Object.assign(this.data, data)
		this.fixData()
	}

	/**
	 * @param {import("../types").TimelineEntryN3} data
	 */
	applyN3(data) {
		Object.assign(this.data, data)
		this.fixData()
	}

	/**
	 * This should keep the same state when applied multiple times to the same data.
	 * All mutations should act exactly once and have no effect on already mutated data.
	 */
	fixData() {
	}

	getCaption() {
		const edge = this.data.edge_media_to_caption.edges[0]
		if (!edge) return null // no caption
		else return edge.node.text.replace(/\u2063/g, "") // I don't know why U+2063 INVISIBLE SEPARATOR is in here, but it is, and it causes rendering issues with certain fonts, so let's just remove it.
	}

	/**
	 * Try to get the first meaningful line or sentence from the caption.
	 */
	getCaptionIntroduction() {
		const caption = this.getCaption()
		if (!caption) return null
		else return caption.split("\n")[0].split(". ")[0]
	}

	/**
	 * Alt text is not available for N2, the caption or a placeholder string will be returned instead.
	 * @override
	 */
	getAlt() {
		return this.data.accessibility_caption || this.getCaption() || "No image description available."
	}

	/**
	 * @returns {import("../types").BasicOwner}
	 */
	getBasicOwner() {
		return this.data.owner
	}

	/**
	 * Not available on N3!
	 * Returns proxied URLs (P)
	 */
	getThumbnailSrcsetP() {
		if (this.data.thumbnail_resources) {
			return this.data.thumbnail_resources.map(tr => {
				return `${proxyImage(tr.src, tr.config_width)} ${tr.config_width}w`
			}).join(", ")
		} else {
			return null
		}
	}

	/**
	 * Not available on N3!
	 * Returns proxied URLs (P)
	 * @param {number} size
	 * @return {import("../types").DisplayResource}
	 */
	getSuggestedThumbnailP(size) {
		if (this.data.thumbnail_resources) {
			let found = null // start with nothing
			for (const tr of this.data.thumbnail_resources) { // and keep looping up the sizes (sizes come sorted)
				found = tr
				if (tr.config_width >= size) break // don't proceed once we find one large enough
			}
			return {
				config_width: found.config_width,
				config_height: found.config_height,
				src: proxyImage(found.src, found.config_width) // force resize to config rather than requested
			}
		} else {
			return null
		}
	}

	getThumbnailSizes() {
		return `(max-width: 820px) 200px, 260px` // from css :(
	}

	async fetchChildren() {
		// Cached children?
		if (this.children) return this.children
		// Not a gallery? Convert self to a child and return.
		if (this.getType() !== constants.symbols.TYPE_GALLERY) {
			return this.children = [new TimelineChild(this.data)]
		}
		// Fetch children if needed
		if (!this.data.edge_sidecar_to_children) {
			await this.update()
		}
		// Create children
		return this.children = this.data.edge_sidecar_to_children.edges.map(e => new TimelineChild(e.node))
	}

	/**
	 * Returns a proxied profile pic URL (P)
	 * @returns {Promise<import("../types").ExtendedOwner>}
	 */
	async fetchExtendedOwnerP() {
		// Do we just already have the extended owner?
		if (this.data.owner.full_name) { // this property is on extended owner and not basic owner
			const clone = proxyExtendedOwner(this.data.owner)
			this.ownerPfpCacheP = clone.profile_pic_url
			return clone
		}
		// The owner may be in the user cache, so copy from that.
		// This could be implemented better.
		else if (collectors.requestCache.hasWithoutClean("user/"+this.data.owner.username)) {
			/** @type {import("./User")} */
			const user = collectors.requestCache.getWithoutClean("user/"+this.data.owner.username)
			this.data.owner = {
				id: user.data.id,
				username: user.data.username,
				is_verified: user.data.is_verified,
				full_name: user.data.full_name,
				profile_pic_url: user.data.profile_pic_url // _hd is also available here.
			}
			const clone = proxyExtendedOwner(this.data.owner)
			this.ownerPfpCacheP = clone.profile_pic_url
			return clone
		}
		// We'll have to re-request ourselves.
		else {
			await this.update()
			const clone = proxyExtendedOwner(this.data.owner)
			this.ownerPfpCacheP = clone.profile_pic_url
			return clone
		}
	}

	async fetchFeedData() {
		const children = await this.fetchChildren()
		return {
			title: this.getCaptionIntroduction() || `New post from @${this.getBasicOwner().username}`,
			description: rssDescriptionTemplate({
				caption: this.getCaption(),
				children: children.map(child => ({
					src: `${constants.website_origin}${child.getDisplayUrlP()}`,
					alt: child.getAlt(),
					width: child.data.dimensions.width,
					height: child.data.dimensions.height
				}))
			}),
			author: this.data.owner.username,
			url: `${constants.website_origin}/p/${this.data.shortcode}`,
			guid: `${constants.website_origin}/p/${this.data.shortcode}`, // Is it wise to keep the origin in here? The same post would have a different ID from different servers.
			date: new Date(this.data.taken_at_timestamp*1000)
			/*
				Readers should display the description as HTML rather than using the media enclosure.
				enclosure: {
					url: this.data.display_url,
					type: "image/jpeg" //TODO: can instagram have PNGs? everything is JPEG according to https://medium.com/@autolike.it/how-to-avoid-low-res-thumbnails-on-instagram-android-problem-bc24f0ed1c7d
				}
			*/
		}
	}
}

module.exports = TimelineEntry
