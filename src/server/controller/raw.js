const router = require('koa-better-router')();
const { createFeed } = require('../../fetcher/feed');
const FeedRepo = require('../repository/feed');
const FeedItemRepo = require('../repository/feed-items');

router.addRoute("GET /raw/iframe/", (ctx,next) => {
	ctx.response.type = 'text/html';
	ctx.response.status = 200;
	ctx.response.body = ctx.session.loadedPage || '';
    next();
});

router.addRoute("GET /raw/test-feed/", (ctx,next) => {
	ctx.response.type = 'text/xml';
	ctx.response.status = 200;
	ctx.response.body = ctx.session.generated || '';
    next();
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
	next()
});

module.exports = router;
