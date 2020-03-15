

class Feed {

	constructor({
		settings,
		id = 0,
		lastCheck
	}) {
		this.settings = settings;
		this.id = id;
		this.lastCheck = lastCheck;
	}

}

module.exports = Feed;
