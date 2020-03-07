const debug = require("debug")("wcx-local");
const router = require('koa-better-router')();
const FS = require('fs');

const file = `${__dirname}/../../../data/fn2.html`;

router.addRoute("GET /iframe/", (ctx,next) => {
    let fullPath = ctx.request.path;

	ctx.response.type = 'text/html';
	ctx.response.status = 200;
	ctx.response.body = FS.createReadStream(file, {
		encoding: 'utf8'
	});

    next();
});

module.exports = router;
