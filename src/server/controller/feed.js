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
		checkinterval: 60 * 4
	}
	let res = await FeedRepo.createFeed(e);
	ctx.session.url = null;
	ctx.session.loadParams = null;
	ctx.session.selectors = null;
	ctx.session.loadedPage = null;
	return res;
};

controller['POST /delete'] = async (data) => {
	await FeedRepo.deleteFeed(data.id);
	return { ok: 1 };
};

controller['GET /list'] = async () => {
	let list = await FeedRepo.getAllFeeds();
	return list;
};



module.exports = {
	controller
};
