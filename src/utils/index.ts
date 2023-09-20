import axios from "axios";
import { readFileSync } from "node:fs";

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			CACHE: "true" | "false";
			REDIS_URL: string;
			PROXY: "true" | "false";
			FETCH_PROVIDERS: "true" | "false";
			PROVIDERS_LIST_URL: "true" | "false";
			USE_HEADLESS_PROVIDERS: "true" | "false";
			FETCH_PROVIDERS_EVERY: string;
			RSS: "true" | "false";
			SLEEP_TIME_PER_REQUEST: number;
			ITEMS_PER_RSS: number;
			URL: string;
		}
	}
}

export const axiosInstance = axios.create({
	baseURL: "http://127.0.0.1:3000/api/",
});

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGitHash() {
	const rev = readFileSync(".git/HEAD")
		.toString()
		.trim()
		.split(/.*[: ]/)
		.slice(-1)[0];
	if (rev.indexOf("/") === -1) {
		return rev;
	} else {
		return readFileSync(`.git/${rev}`).toString().trim();
	}
}
