const debug = require('debug')('wcx');
const methods = {};

function expectArguments(request) {
	let data;
	// console.log('getting args',request.body,request.query);
	try {
		if (request.body) {
			data = request.body;
		} else {
			data = request.query.__p ? JSON.parse(request.query.__p) : {};
		}
	} catch (e) {
		throw new Error("invalid json");
	}
	return data;
}

methods.wrap = function(fn) {
	let params = {};
	return async(ctx,next) => {
		try {
			params = expectArguments(ctx.request);
		} catch (e) {
			ctx.body = JSON.stringify(e,null,' ');
			return next();
		}
		try {
			let res = await fn(params,ctx.request);
			ctx.body = JSON.stringify(res,null,' ');
		} catch(err) {
			debug("request error",err);
			let data;
			if (err instanceof Error) {
				data = {};
				data.error = true;
				Object.getOwnPropertyNames(err).forEach(function (key) {
					data[key] = err[key];
				}, err);
			} else {
				data = err;
			}
			ctx.body = JSON.stringify(data,null,' ');
		}
		next();
	}
};

methods.fillRouter = function(router,list) {
	for(let r in list) {
		router.addRoute(r,methods.wrap(
			list[r]
		));
	}
};

module.exports = methods;
