import {q, ElemJS} from "./elemjs/elemjs.js"

/** @type {PostOverlay[]} */
const postOverlays = []
const titleHistory = []
titleHistory.push(document.title)
const shortcodeDataMap = new Map()

window.addEventListener("popstate", event => {
	// console.log(event.state, postOverlays.length)
	if (event.state) {
		if (event.state.view === "post_overlay") {
			loadPostOverlay(event.state.shortcode, false)
		}
	} else { // event.state === null which means back to originally loaded page, so pop overlay
		setTimeout(() => { // make sure document is entirely loaded
			if (titleHistory.length === 1) {
				document.title = titleHistory[0]
			} else if (titleHistory.length >= 2) {
				titleHistory.pop()
				document.title = titleHistory.slice(-1)[0]
			}
			if (postOverlays.length) {
				popOverlay()
			} else {
				window.location.reload()
			}
		})
	}
})

function pushOverlay(overlay) {
	postOverlays.push(overlay)
	document.body.style.overflowY = "hidden"
}

function popOverlay() {
	const top = postOverlays.pop()
	if (top) {
		top.pop()
	}
	if (postOverlays.length === 0) document.body.style.overflowY = "auto"
}

class PostOverlay extends ElemJS {
	constructor() {
		super("div")
		this.class("post-overlay")
		this.event("click", event => {
			if (event.target === event.currentTarget) history.back()
		})
		this.loaded = false
		this.available = true
		setTimeout(() => {
			if (!this.loaded) {
				this.class("loading")
				this.child(
					new ElemJS("div").class("loading-inner").text("Loading...")
				)
			}
		}, 0)
	}

	setContent(html) {
		this.html(html)
		this.loaded = true
		this.removeClass("loading")
	}

	showError() {
		this.loaded = true
		this.class("loading")
		this.clearChildren()
		this.child(
			new ElemJS("div").class("loading-inner").text("Request failed.")
		)
	}

	pop() {
		this.element.remove()
		this.available = false
	}
}

const timeline = q("#timeline")
if (timeline) {
	timeline.addEventListener("click", event => {
		/** @type {HTMLElement[]} */
		//@ts-ignore
		const path = event.composedPath()
		const postLink = path.find(element => element.classList && element.classList.contains("sized-link") && element.hasAttribute("data-shortcode"))
		if (postLink) {
			event.preventDefault()
			const shortcode = postLink.getAttribute("data-shortcode")
			loadPostOverlay(shortcode, true)
		}
	})
}

function fetchShortcodeFragment(shortcode) {
	if (shortcodeDataMap.has(shortcode)) return Promise.resolve(shortcodeDataMap.get(shortcode))
	else return fetch(`/fragment/post/${shortcode}`).then(res => res.json())
}

function loadPostOverlay(shortcode, shouldPushState) {
	const overlay = new PostOverlay()
	document.body.appendChild(overlay.element)
	pushOverlay(overlay)
	if (shouldPushState) history.pushState({view: "post_overlay", shortcode: shortcode}, "", `/p/${shortcode}`)
	const fetcher = fetchShortcodeFragment(shortcode)
	fetcher.then(root => {
		shortcodeDataMap.set(shortcode, root)
		if (overlay.available) {
			const {title, html} = root
			overlay.setContent(html)
			if (overlay.available) {
				document.title = title
			}
		}
	})
	fetcher.catch(error => {
		console.error(error)
		overlay.showError()
	})
}
