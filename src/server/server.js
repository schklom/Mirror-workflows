const koa = require('koa');
const serve = require('koa-static');
// const session = require('koa-session');
const FS = require('fs');
const Router = require('koa-better-router');
const ReqRes = require('./util/reqres');
const parse = require('co-body');

const path = require("path");
var app = new koa();


app.use( serve( path.normalize(__dirname+'/../../dist/'),{
	maxage : 0,
	hidden : false,
	index : "index.html",
	defer : true
}) );

app.use(async (ctx, next) => {
	await next();
	const p = ctx.request.path;
	if (p.indexOf('.') === -1) {
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
		//console.log("body parsed",ctx.request.body);
	}
	await next();
});

const controllerRegexp = /^([a-z]+)\.js$/i;
FS.readdirSync(path.normalize(__dirname+'/controller/')).forEach((entry) => {
	let match = controllerRegexp.exec(entry);
	if (!match) return;
	let name = match[1].toLowerCase();
	let router;
	if (name !== 'iframe') {
		let module = require(__dirname+'/controller/'+entry);
		if (!module.controller) return;
		router = Router({ prefix: '/api/'+name });
		ReqRes.fillRouter(router, module.controller);
	} else {
		router = require(__dirname+'/controller/'+entry);
	}
	app.use(router.middleware());
});

// app.use(Comic.router.routes());
// app.use(Favorite.router);
// app.use(Mirror.router);
// app.use(StaticMirror.router);


module.exports = app;
