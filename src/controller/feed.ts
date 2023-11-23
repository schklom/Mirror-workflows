import Router from 'koa-better-router';
import crypto from 'node:crypto';
import * as FeedRepo from '../repository/feed.js'
import type { FeedModel } from '../util/types.js';

const router = Router({
	prefix: '/api/feed'
});

router.addRoute('POST /create', async (ctx) => {
	let data = ctx.request.body;
	const mgmtKey = ctx.query.mgmtKey;
	const isPubInstance = !!process.env.PUB_INSTANCE
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
		inserterrorsasitems: true,
		managementkey: isPubInstance ? mgmtKey : ''
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
	const mgmtKey = ctx.query.mgmtKey;
	let feed = await FeedRepo.getById(data.uid);
	if (!assertValidManagementKey(mgmtKey, feed)) {
		ctx.response.status = 400;
		ctx.json = { error: 'invalid management key' };
		return;
	}
	await FeedRepo.deleteFeed(data.uid);
	ctx.json = { ok: 1 };
});

router.addRoute('GET /list', async (ctx) => {
	const mgmtKey = ctx.query.mgmtKey;
	const adminKey = process.env.PUB_ADMIN_MGMT_KEY;
	let useKey = mgmtKey === adminKey ? null : mgmtKey ? mgmtKey : '-';
	let list = await FeedRepo.getAllFeeds(useKey);
	list.sort((a, b) => {
		return a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1;
	});
	ctx.json = list;
});

router.addRoute('POST /save', async (ctx) => {
	let data = ctx.request.body;
	const mgmtKey = ctx.query.mgmtKey;
	let feed = await FeedRepo.getById(data.uid);
	if (!assertValidManagementKey(mgmtKey, feed)) {
		ctx.response.status = 400;
		ctx.json = { error: 'invalid management key' };
		return;
	}
	Object.keys(data).forEach(key => {
		feed[key] = data[key];
	});
	await FeedRepo.updateFeed(feed);
	ctx.json = feed;
});

router.addRoute('POST /refreshsecret', async (ctx) => {
	let data = ctx.request.body;
	const mgmtKey = ctx.query.mgmtKey;
	let feed = await FeedRepo.getById(data.uid);
	if (!assertValidManagementKey(mgmtKey, feed)) {
		ctx.response.status = 400;
		ctx.json = { error: 'invalid management key' };
		return;
	}
	feed.secret = crypto.randomBytes(8).toString('hex'),
	await FeedRepo.updateFeed(feed);
	return feed;
});

async function assertValidManagementKey(key: string, feed: FeedModel): Promise<boolean> {
	const adminKey = process.env.PUB_ADMIN_MGMT_KEY;
	if (adminKey && key === adminKey) return true;
	if (feed.managementkey && key === feed.managementkey) return true;
	return false;
}

export default router
