
export type FeedItem = {
	link: string,
	title: string,
	description: string,
	image: string,
	added: Date
}

export type FeedSettings = FeedLoadParams & FeedSelector

export type SiteData = {
	title: string
	description: string
	url: string
}

export type FeedLoadParams = {
	url: string
	waitFor: string
	waitForTime: number
	waitForSelector: string
	loadScripts: boolean
}

export type FeedSelector = {
	pathEntry: string
	pathTitle: string
	pathLink: string
	pathDescription: string
	pathImage: string
}

export type FeedModel = {
	uid: number
	lastcheck: Date
	nextcheck: Date
	created: Date
	noitemsiserror: boolean;
	inserterrorsasitems: boolean;
	log: { errors: { message: string, stack?: string }[] }
	secret: string
	checkinterval: number
	errorcount: number
	maxitems: number
	title: string
	description: string
	url: string
	loadparams: FeedLoadParams
	selectors: FeedSelector
	managementkey: string
	lastretrieval: Date
}

export type FetchParams = {
	url: string
	body?: string,
	headers?: Record<string,string>
	cookies?: string
	referrer?: string
	waitTime?: number
	waitForSelector?: string
}
