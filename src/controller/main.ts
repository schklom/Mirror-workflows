import Router from 'koa-better-router';
import getFilteredHtml from '../service/getfilteredhtml.js';
import { generateFeedFromSettings, getHtml, getDom, extractSitedata } from '../service/feed.js';
import { XMLSerializer } from 'xmldom';
import { FeedModel } from '../util/types.js';

const router = Router({
	prefix: '/api/main'
});

const injectScript = './ui/dist/inner.js';

router.addRoute('POST /load-page', async (ctx) => {
	// console.log('load-page', ctx.request.body);
	let data = ctx.request.body;
	ctx.session.url = data.url;
	ctx.session.loadParams = data;
	let html = await getHtml(data);
	html = await getFilteredHtml({
		input: html,
		baseUrl: data.url,
		inlineStylesheets: true,
		inlineScripts: [ injectScript ]
	});
	let dom = getDom(html);
	let siteData = extractSitedata(dom, html, { url: data.url });
	html = new XMLSerializer().serializeToString(dom);
	ctx.session.loadedPage = html;
	ctx.json = { ok: true, length: html.length, title: siteData.title, description: siteData.description  }
})

router.addRoute('POST /set-selectors', async (ctx) => {
	let data = ctx.request.body;
	ctx.session.selectors = data;
	const settings: FeedModel = {
		uid: 0,
		lastcheck: new Date(),
		nextcheck: new Date(),
		created: new Date(),
		noitemsiserror: false,
		inserterrorsasitems: true,
		log: { errors: [] },
		checkinterval: 60 * 4,
		errorcount: 0,
		maxitems: 100,
		url: ctx.session.loadParams.url,
		title: 'temp feed',
		description: '',
		loadparams: { ...ctx.session.loadParams },
		selectors: { ...ctx.session.selectors },
		secret: 'temp',
		managementkey: 'temp',
		lastretrieval: new Date()
	};
	let feed = await generateFeedFromSettings(settings);
	ctx.session.generated = feed.atom1();
	ctx.json = { ok: true }
})


export default router;
