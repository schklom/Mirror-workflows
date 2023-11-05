import axios from "axios";
import { randomUserAgent } from "..";
import { IGetHtml, IGetHtmlOptions, IGetJson } from "../types/functions";

export class AxiosScraper implements IGetHtml, IGetJson {
	constructor(
		public config: {
			baseURL: string;
		},
	) {}

	async getHtml({ path }: IGetHtmlOptions): Promise<string> {
		const URLTOVISIT = `${this.config.baseURL}/${path}`;

		const { data: html } = await axios.get(URLTOVISIT, {
			headers: {
				Host: new URL(URLTOVISIT).host,
				"User-Agent": randomUserAgent,
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
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
		return html;
	}

	async getJson<T>({ path, data }: IGetHtmlOptions): Promise<T> {
		const FULL_URL = `${this.config.baseURL}/${path}`;
		const headers = {
			Host: new URL(this.config.baseURL).hostname,
			"User-Agent": randomUserAgent,
			Accept: "text/html,application/xhtml+xml,application/json,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.5",
			"Accept-Encoding": "gzip, deflate, br",
			DNT: 1,
			Connection: "keep-alive",
			"Upgrade-Insecure-Requests": 1,
			"Sec-Fetch-Dest": "document",
			"Sec-Fetch-Mode": "navigate",
			"Sec-Fetch-Site": "none",
			"Sec-Fetch-User": "?1",
		};

		let json;

		if (data) {
			const resp = await axios.post(FULL_URL, data, {
				headers,
			});
			json = resp.data;
		} else {
			const resp = await axios.get(FULL_URL, {
				headers,
			});
			json = resp.data;
		}
		return json as T;
	}
}
