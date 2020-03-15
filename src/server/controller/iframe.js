const router = require('koa-better-router')();

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

module.exports = router;
