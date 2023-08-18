import { IGetHtml, IGetHtmlOptions, IGetJson, randomUserAgent } from "..";
import {
	createRedisKeyFromUrl,
	mediaIdToShortcode,
	reverseString,
} from "@/utils";
import redis from "@/utils/redis";
import axios from "axios";

export class AxiosScraper implements IGetHtml, IGetJson {
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

	async getHtml({ path, expireTime }: IGetHtmlOptions): Promise<string> {
		const URLTOVISIT = `${this.config.baseURL}/${path}`;
		const reversedId = path.split("c/").at(1);
		let KEY: string;

		if (reversedId) {
			const shortcode = mediaIdToShortcode(reverseString(reversedId));
			KEY = createRedisKeyFromUrl(`${this.config.baseURL}/c/${shortcode}`);
		} else {
			KEY = createRedisKeyFromUrl(URLTOVISIT);
		}

		const cachedData = await redis.get(KEY);
		if (cachedData) return cachedData as string;

		const { data: html } = await axios.get(URLTOVISIT, {
			headers: {
				Host: new URL(URLTOVISIT).host,
				"User-Agent": randomUserAgent,
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br",
				DNT: 1,
				Connection: "keep-alive",
				"Upgrade-Insecure-Requests": 1,
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "none",
				"Sec-Fetch-User": "?1",
			},
		});
		await redis.setex(KEY, expireTime, html);

		return html;
	}

	async getJson<T>({ path, expireTime }: IGetHtmlOptions): Promise<T> {
		const FULL_URL = `${this.config.baseURL}/${path}`;
		const KEY = createRedisKeyFromUrl(FULL_URL);

		const cachedData = await redis.get(FULL_URL);
		if (cachedData) return JSON.parse(cachedData) as T;

		const { data: json } = await axios.get(FULL_URL, {
			headers: {
				Host: new URL(this.config.baseURL).hostname,
				"User-Agent": randomUserAgent,
				Accept:
					"text/html,application/xhtml+xml,application/json,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br",
				DNT: 1,
				Connection: "keep-alive",
				"Upgrade-Insecure-Requests": 1,
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "none",
				"Sec-Fetch-User": "?1",
			},
		});
		await redis.setex(KEY, expireTime, JSON.stringify(json));

		return json as T;
	}
}
