const Repo = require('../repository/feed');
const crypto = require('crypto');

const controller = {};

controller['POST /create'] = async (data, ctx) => {
	let e = {
		url: ctx.session.url,
		loadparams: ctx.session.loadParams,
		selectors: ctx.session.selectors,
		secret: crypto.randomBytes(8).toString('hex')
	}
	let res = await Repo.createFeed(e);
	ctx.session.url = null;
	ctx.session.loadParams = null;
	ctx.session.selectors = null;
	ctx.session.loadedPage = null;
	return res;
};

controller['POST /delete'] = async (data) => {
	await Repo.deleteFeed(data.id);
	return { ok: 1 };
};

controller['GET /list'] = async () => {
	let list = await Repo.getAllFeeds();
	return list;
};

module.exports = {
	controller
};
