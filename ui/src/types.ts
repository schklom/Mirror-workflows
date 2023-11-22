
export type Feed = {
	selector: string;
	url: string;
	uid: number
	title: string
	description: string
	checkinterval: number
	maxitems: number
	inserterrorsasitems: boolean
	noitemsiserror: boolean
	secret?: string
	created: Date
	lastcheck: Date
	nextcheck: Date
	errorcount: number
	log: {
		errors: string[]
	}
	selectors: {
		pathDescription: string;
		pathTitle: string;
		pathLink: string;
		pathDate: string;
		pathImage: string;
	}
	loadparams: {
		url: string
		cookies: string
		headers: string
		body: string
		waitFor: number
		waitForTime: number
		waitForSelector: string
		loadScripts: boolean
	}
}
