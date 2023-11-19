

export default class FeedSettings {

	url: string
	waitFor: string
	waitForTime: number
	waitForSelector: string
	loadScripts: boolean
	pathEntry: string
	pathTitle: string
	pathLink: string
	pathDescription: string
	pathImage: string

	constructor({
		url,
		waitFor,
		waitForTime,
		waitForSelector,
		loadScripts,
		pathEntry,
		pathTitle,
		pathLink,
		pathImage,
		pathDescription
	}) {
		this.url = url;
		this.waitFor = waitFor;
		this.waitForTime = waitForTime;
		this.waitForSelector = waitForSelector;
		this.loadScripts = loadScripts;
		this.pathEntry = pathEntry;
		this.pathTitle = pathTitle;
		this.pathLink = pathLink;
		this.pathDescription = pathDescription;
		this.pathImage = pathImage;
	}

}

