const router = require('koa-better-router')();

router.addRoute("GET /iframe/", (ctx,next) => {
	ctx.response.type = 'text/html';
	ctx.response.status = 200;
	ctx.response.body = ctx.session.loadedPage || '';
    next();
});

module.exports = router;
