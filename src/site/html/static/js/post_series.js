import {controller} from "./pagination.js"

class Timeline {
	constructor() {
		this.shortcodes = []
		/** @type {Map<string, TimelineEntry>} */
		this.entries = new Map()
		controller.addActivatedCallback(() => this.update())
		this.update()
	}

	update() {
		this.shortcodes = []
		document.querySelectorAll("#timeline .sized-link").forEach(element => {
			const shortcode = element.getAttribute("data-shortcode")
			this.shortcodes.push(shortcode)
			this.entries.set(shortcode, new TimelineEntry(this, shortcode))
		})
		console.log(this.shortcodes)
	}

	fetch() {
		return controller.activate()
	}
}

/**
 * @param {Timeline} timeline
 * @param {string} shortcode
 */
class TimelineEntry {
	constructor(timeline, shortcode) {
		this.timeline = timeline
		this.shortcode = shortcode
	}

	getNextShortcode() {
		return this.timeline.shortcodes[this.timeline.shortcodes.indexOf(this.shortcode)+1]
	}

	getPreviousShortcode() {
		return this.timeline.shortcodes[this.timeline.shortcodes.indexOf(this.shortcode)-1]
	}

	isFirstEntry() {
		return this.timeline.shortcodes.indexOf(this.shortcode) === 0
	}

	isLastEntry() {
		return this.timeline.shortcodes.indexOf(this.shortcode) === this.timeline.shortcodes.length-1
	}
}

const timeline = new Timeline()

export {timeline}
