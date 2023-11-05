import { AxiosScraper } from "@/services/scrapers/axios";
import { PlaywrightScraper } from "@/services/scrapers/playwright";
import * as cheerio from "cheerio";

type ParametersType = {
	path: string;
	scraper: AxiosScraper | PlaywrightScraper;
};

export async function fetchJSON<T>({ path, scraper }: ParametersType): Promise<T> {
	if (scraper instanceof AxiosScraper) {
		return await scraper.getJson<T>({ path });
	} else {
		const html = await scraper.getHtml({ path });
		const $ = cheerio.load(html);
		return JSON.parse($("pre").text()) as T;
	}
}
