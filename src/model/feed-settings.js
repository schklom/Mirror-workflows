

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
	}

}

module.exports = FeedSettings;
