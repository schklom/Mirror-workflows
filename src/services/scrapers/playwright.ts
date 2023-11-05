import redis from "@/utils/redis";
import { randomUserAgent } from "..";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { Request, Route, chromium } from "playwright-core";
import { IGetHtml, IGetHtmlOptions } from "../types/functions";

export class PlaywrightScraper implements IGetHtml {
	constructor(
		public config: {
			baseURL: string;
		},
	) {}

	private abortUnwantedRequests(unwantedRequest: string[], route: Route, request: Request) {
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

	async getHtml({ path }: IGetHtmlOptions): Promise<string> {
		const URL = `${this.config.baseURL}/${path}`;
		const cachedData = await redis.get(`raw:${URL}`);
		if (cachedData) {
			return cachedData;
		}

		const { page } = await this.init();

		page.route("**/*", (route, request) =>
			this.abortUnwantedRequests(["image", "script", "stylesheet", "font"], route, request),
		);

		await page.goto(URL, { waitUntil: "load" });
		const html = await page.content();

		await page.close();
		await redis.setex(`raw:${URL}`, convertTTlToTimestamp("10m"), html);
		return html;
	}
}
