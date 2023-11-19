import Router from 'koa-better-router';
import getFilteredHtml from '../fetcher/getfilteredhtml.js';
import { generateFeedFromSettings, getHtml, getDom, extractSitedata } from '../fetcher/feed.js';
import { XMLSerializer } from 'xmldom';

const router = Router({
	prefix: '/api/main'
});

const injectScript = './dist/inner.js';
// URL.resolve( baseUrl, '/inner.js' );

router.addRoute('POST /load-page', async (ctx) => {
	let data = JSON.parse(ctx.request.body);
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
	let data = JSON.parse(ctx.request.body);
	ctx.session.selectors = data;
	let settings: Record<string,any> = {};
	settings.url = ctx.session.loadParams.url;
	settings.loadparams = { ...ctx.session.loadParams };
	settings.selectors = { ...ctx.session.selectors };
	let feed = await generateFeedFromSettings(settings);
	ctx.session.generated = feed.atom1();
	ctx.json = { ok: true }
})


export default router;
