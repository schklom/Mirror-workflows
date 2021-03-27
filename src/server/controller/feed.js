const FeedRepo = require('../repository/feed');
const crypto = require('crypto');

const controller = {};

controller['POST /create'] = async (data, ctx) => {
	let e = {
		title: data.title,
		description: data.description,
		url: ctx.session.url,
		loadparams: ctx.session.loadParams,
		selectors: ctx.session.selectors,
		secret: crypto.randomBytes(8).toString('hex'),
		log: { errors: [], infos: [] },
		nextcheck: new Date(),
		errorcount: 0,
		checkinterval: 60 * 4,
		noitemsiserror: false,
		inserterrorsasitems: true
	}
	if (e.title.length > 255) {
		e.title = e.title.substr(0, 255);
	}
	if (e.description && e.description.length > 255) {
		e.description = e.description.substr(0, 255);
	}
	let res = await FeedRepo.createFeed(e);
	ctx.session.url = null;
	ctx.session.loadParams = null;
	ctx.session.selectors = null;
	ctx.session.loadedPage = null;
	return res;
};

controller['POST /delete'] = async (data) => {
	await FeedRepo.deleteFeed(data.uid);
	return { ok: 1 };
};

controller['GET /list'] = async () => {
	let list = await FeedRepo.getAllFeeds();
	list.sort((a, b) => {
		return a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1;
	});
	return list;
};

controller['POST /save'] = async (data) => {
	let feed = await FeedRepo.getById(data.uid);
	Object.keys(data).forEach(key => {
		feed[key] = data[key];
	});
	await FeedRepo.updateFeed(feed);
	return feed;
};

controller['POST /refreshsecret'] = async (data) => {
	let feed = await FeedRepo.getById(data.uid);
	feed.secret = crypto.randomBytes(8).toString('hex'),
	await FeedRepo.updateFeed(feed);
	return feed;
};

module.exports = {
	controller
};
