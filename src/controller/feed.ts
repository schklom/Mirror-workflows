import Router from 'koa-better-router';
import crypto from 'node:crypto';
import * as FeedRepo from '../repository/feed.js'

const router = Router({
	prefix: '/api/feed'
});

router.addRoute('POST /create', async (ctx) => {
	let data = ctx.request.body;
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
	ctx.json = res;
});

router.addRoute('POST /delete', async (ctx) => {
	let data = ctx.request.body;
	await FeedRepo.deleteFeed(data.uid);
	ctx.json = { ok: 1 };
});

router.addRoute('GET /list', async (ctx) => {
	let list = await FeedRepo.getAllFeeds();
	list.sort((a, b) => {
		return a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1;
	});
	ctx.json = list;
});

router.addRoute('POST /save', async (ctx) => {
	let data = ctx.request.body;
	let feed = await FeedRepo.getById(data.uid);
	Object.keys(data).forEach(key => {
		feed[key] = data[key];
	});
	await FeedRepo.updateFeed(feed);
	ctx.json = feed;
});

router.addRoute('POST /refreshsecret', async (ctx) => {
	let data = ctx.request.body;
	let feed = await FeedRepo.getById(data.uid);
	feed.secret = crypto.randomBytes(8).toString('hex'),
	await FeedRepo.updateFeed(feed);
	return feed;
});

export default router
