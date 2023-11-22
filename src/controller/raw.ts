import Router from 'koa-better-router';
import { createFeed } from '../service/feed.js';
import * as FeedRepo from '../repository/feed.js';
import * as FeedItemRepo from '../repository/feed-items.js';

const router = Router();

router.addRoute("GET /raw/iframe/", (ctx, next) => {
	ctx.response.type = 'text/html';
	ctx.response.status = 200;
	ctx.response.body = ctx.session.loadedPage || '';
    return next();
});

router.addRoute("GET /raw/test-feed/", (ctx, next) => {
	ctx.response.type = 'text/xml';
	ctx.response.status = 200;
	ctx.response.body = ctx.session.generated || '';
    return next();
});

router.addRoute('GET /feed/get/:id/:secret', async (ctx, next) => {
	let feedSettings = await FeedRepo.getById(~~ctx.params.id);
	if (!feedSettings) {
		ctx.response.status = 404;
		return { error: 'not found' };
	}
	if (feedSettings.secret !== ctx.params.secret) {
		ctx.response.status = 400;
		return { error: 'not allowed' }
	}
	let items = await FeedItemRepo.getItemsForFeed(feedSettings.uid, feedSettings.maxitems);
	let feed = createFeed(feedSettings, items);
	ctx.response.type = 'text/xml';
	ctx.response.status = 200;
	ctx.response.body = feed.atom1();
	await FeedRepo.updateLastRetrieval(feedSettings.uid);
	return next();
});

export default router
