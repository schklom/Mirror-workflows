import koa from 'koa';
import serve from 'koa-static';
import parse from 'co-body';
import session from 'koa-session';
import * as cookieStorage from './util/cookieStorage.js';
import crypto from 'crypto';
import FeedRouter from './controller/feed.js';
import MainRouter from './controller/main.js';
import RawRouter from './controller/raw.js';

export default function createApp() {
	const app = new koa();

	app.keys = [ crypto.randomBytes(24).toString('hex') ];

	app.use(session({
		renew: true,
		key: 'pol:app',
		maxAge: 1000 * 60 * 60 * 12,
		store: cookieStorage
	}, app));

	app.use( serve('./ui-dist/'),{
		maxage : 0,
		hidden : false,
		index : "index.html",
		defer : true
	});

	app.use(async (ctx, next) => {
		try {
			await next();
		} catch (err) {
			ctx.status = err.status || 500;
			if (ctx.request.header.accept === 'application/json') {
				ctx.body = JSON.stringify({ error: err.message });
			} else {
				ctx.body = err.message;
			}
			ctx.app.emit('error', err, ctx);
		}
	});

	app.use(async (ctx, next) => {
		await next();
		if (ctx.request.path === 'index.html') {
			if (!ctx.session.view) ctx.session.view = 0;
			ctx.session.view += 1;
		}
	});

	app.use(async (ctx, next) => {
		await next();
		const p = ctx.request.path;
		if (p.indexOf('.') === -1 && !ctx.response.body) {
			ctx.request.path = 'index.html';
		}
	});

	//rewrite static assets
	const assetRevReg = /\.[0-9a-zA-Z]{9}\./;
	app.use(async (ctx, next) => {
		await next();
		const p = ctx.request.path;
		ctx.request.path = p.replace(assetRevReg,'.');
	});

	app.use(async (ctx,next) => {
		if (ctx.request.method === 'POST' && ctx.request.header['content-length'] > 0) {
			ctx.request.body = await parse.json(ctx);
			// console.log("body parsed",ctx.request.body);
		}
		await next();
	});

	app.use(async (ctx,next) => {
		await next();
		if ('json' in ctx) {
			console.log('writing response', ctx.json);
			ctx.response.body = JSON.stringify({ ok: true, data: ctx.json });
		}
	});

	app.use(FeedRouter.middleware());
	app.use(MainRouter.middleware());
	app.use(RawRouter.middleware());

	return app;
}


