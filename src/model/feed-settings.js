

class FeedSettings {

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

module.exports = FeedSettings;
