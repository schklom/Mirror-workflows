import { IGetHtml, IGetHtmlOptions, randomUserAgent } from "..";
import { createRedisKeyFromUrl } from "@/utils";
import redis from "@/utils/redis";
import { Request, Route, chromium } from "playwright-core";

export class PlaywrightScraper implements IGetHtml {
	constructor(
		public config: {
			baseURL: string;
			ttl?: {
				posts?: number;
				post?: number;
				search?: number;
			};
		},
	) {}

	private abortUnwantedRequests(
		unwantedRequest: string[],
		route: Route,
		request: Request,
	) {
		if (unwantedRequest.includes(request.resourceType())) {
			route.abort();
		} else {
			route.continue();
		}
	}

	private async init() {
		const browser = await chromium.launch({
			headless: process.env.NODE_ENV === "development" ? false : true,
			// headless: false,
		});
		const context = await browser.newContext();
		const page = await context.newPage();
		await page.setExtraHTTPHeaders({
			"User-Agent": randomUserAgent,
		});

		return {
			page,
		};
	}

	async getHtml({ path, expireTime }: IGetHtmlOptions): Promise<string> {
		const URL = `${this.config.baseURL}/${path}`;
		const KEY = createRedisKeyFromUrl(URL);

		const cachedData = await redis.get(KEY);
		if (cachedData) return cachedData as string;

		const { page } = await this.init();
		page.route("**/*", (route, request) =>
			this.abortUnwantedRequests(
				["image", "script", "stylesheet", "font"],
				route,
				request,
			),
		);

		await page.goto(URL, { waitUntil: "load" });
		const html = await page.content();

		await Promise.allSettled([
			page.close(),
			redis.setex(KEY, expireTime, html),
		]);

		return html;
	}
}
