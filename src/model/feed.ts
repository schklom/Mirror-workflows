

export default class Feed {

	settings: Record<string,any>;
	id: number;
	lastCheck: Date;

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

