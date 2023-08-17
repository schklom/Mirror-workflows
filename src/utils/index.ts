import { getInstanceProviders, Provider, ProviderCanGet } from "@/services";
import axios from "axios";

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

export function convertTTlToTimestamp(time: string) {
	const format: "m" | "h" | "d" = time.slice(-1).toLowerCase() as
		| "m"
		| "h"
		| "d";
	const timeNumber: number = Number(time.slice(0, -1));

	let t: number;
	switch (format) {
		case "m":
			t = timeNumber * 60;
			break;
		case "h":
			t = timeNumber * 60 * 60;
			break;
		case "d":
			t = timeNumber * 60 * 60 * 60;
	}
	return t;
}

export function getBaseUrl() {
	const url = new URL(process.env.URL);
	return `${url.protocol}//${url.host}`;
}

export function proxyUrl(url: string) {
	if (process.env.PROXY === "false") return url;
	return `${getBaseUrl()}/api/proxy?url=${encodeURIComponent(url)}`;
}

export function replaceBrWithNewline(html: string) {
	return html.replace(/<br>/g, "\n");
}

export function stripHtmlTags(text: string) {
	return text.replace(/<(.|\n)*?>/g, "");
}

export function extractTagsAndUsers(text: string): {
	tags: string[];
	users: string[];
} {
	const regex = /([#@])([^ ]+)([\s]+|$)/g;
	const matches: { tags: string[]; users: string[] } = {
		tags: [],
		users: [],
	};

	let match: RegExpExecArray | null;

	// rome-ignore lint/suspicious/noAssignInExpressions: <explanation>
	while ((match = regex.exec(text)) !== null) {
		if (match[1] === "@") {
			matches.users.push(stripHtmlTags(match[2]));
		} else {
			matches.tags.push(stripHtmlTags(match[2]));
		}
	}

	return matches;
}

export function convertToInstagramUrl(url: string): string {
	const urlObj = new URL(url);

	const startIdx = urlObj.hostname.indexOf(".") + 1;
	const endIdx = urlObj.hostname.lastIndexOf(".");
	const provider = urlObj.hostname.substring(startIdx, endIdx);

	switch (provider) {
		case "wizstat":
		case "picuki":
		case "imgsed":
			return urlObj.search.slice(1);
		case "pimg":
			return urlObj.searchParams.get("url") as string;
		default:
			return url;
	}
}
type MIDDLE_POSITION_PATH = "p" | "c" | "t" | "tags" | "profile";

export function createRedisKeyFromUrl(url: string) {
	const urlObj = new URL(url);

	const LAST_POSITION_PATH = urlObj.pathname
		.split("/")
		.filter((e) => e !== "")
		.at(-1);
	const MIDDLE_POSITION_PATH = urlObj.pathname
		.split("/")
		.filter((e) => e !== "")
		.at(-2) as MIDDLE_POSITION_PATH;

	let DIR: string;

	switch (MIDDLE_POSITION_PATH) {
		case "p":
			DIR = "p";
			break;
		case "tags":
			DIR = "tag";
			break;
		case "c":
			DIR = "p";
			break;
		case "t":
			DIR = "tag";
			break;
		default:
			DIR = "profile";
	}

	const DOMAIN_NAME = urlObj.host;
	const CURSOR = urlObj.searchParams.get("cursor");
	const QUERY = urlObj.searchParams.get("query");
	const USERNAME = urlObj.searchParams.get("username");

	if (CURSOR)
		return `${DOMAIN_NAME}:${DIR}:${LAST_POSITION_PATH}:${CURSOR}`.toLowerCase();
	if (QUERY)
		return `${DOMAIN_NAME}:${LAST_POSITION_PATH}:${QUERY}`.toLowerCase();
	if (USERNAME)
		return `${DOMAIN_NAME}:${LAST_POSITION_PATH}:${USERNAME}`.toLowerCase();

	return `${DOMAIN_NAME}:${DIR}:${LAST_POSITION_PATH}`.toLowerCase();
}

export async function getRandomProvider<T>(canget: ProviderCanGet) {
	const { data: providers } = await axiosInstance.get<Provider[]>("/providers");
	const filteredProviders = providers.filter((provider) =>
		provider.canget.includes(canget),
	);
	const RANDOM_PROVIDER_ID = Math.floor(
		Math.random() * filteredProviders.length,
	);
	return getInstanceProviders(filteredProviders)[RANDOM_PROVIDER_ID] as T;
}

export function mediaIdToShortcode(id: string): string {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let shortcode = "";
	let num = BigInt(id);
	while (num > 0n) {
		const remainder = num % 64n;
		num = num / 64n;
		shortcode = alphabet.charAt(Number(remainder)) + shortcode;
	}
	return shortcode;
}

export function shortcodeToMediaId(shortcode: string): string {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let num = BigInt(0);
	for (let i = 0; i < shortcode.length; i++) {
		const char = shortcode.charAt(i);
		const value = BigInt(alphabet.indexOf(char));
		num = num * 64n + value;
	}
	return num.toString();
}

export function reverseString(str: string): string {
	return str.split("").reverse().join("");
}

export function compactToNumber(compact: string): number {
	const match = compact.match(/[a-z]$/i);
	let factor = 1;
	if (match) {
		switch (match[0].toUpperCase()) {
			case "K":
				factor = 1000;
				break;
			case "M":
				factor = 1000000;
				break;
		}
	}

	return parseFloat(compact) * factor;
}

export function convertTimestampToRelativeTime(timestamp: number): string {
	const now = new Date();
	const prev = new Date(Math.floor(timestamp * 1000));
	const days = now.getDate() - prev.getDate();

	const DIFFERENCES = {
		seconds: now.getSeconds() - prev.getSeconds(),
		minutes: now.getMinutes() - prev.getMinutes(),
		hours: now.getHours() - prev.getHours(),
		days,
		weeks: (days - Math.round(days / 30) * 30) / 7,
		months: now.getMonth() - prev.getMonth(),
		years: now.getFullYear() - prev.getFullYear(),
	};

	if (DIFFERENCES.years > 0) {
		return DIFFERENCES.years > 1
			? `${DIFFERENCES.years} years ago`
			: `${DIFFERENCES.years} year ago`;
	}

	if (DIFFERENCES.months > 0 && DIFFERENCES.months < 12) {
		return DIFFERENCES.months > 1
			? `${DIFFERENCES.months} months ago`
			: `${DIFFERENCES.months} month ago`;
	}

	if (DIFFERENCES.weeks > 0 && DIFFERENCES.weeks < 4 && DIFFERENCES.days >= 7) {
		return DIFFERENCES.weeks > 1
			? `${DIFFERENCES.weeks} weeks ago`
			: `${DIFFERENCES.weeks} week ago`;
	}

	if (DIFFERENCES.days > 0 && DIFFERENCES.days < 7) {
		return DIFFERENCES.days > 1
			? `${DIFFERENCES.days} days ago`
			: `${DIFFERENCES.days} day ago`;
	}

	if (DIFFERENCES.hours > 0 && DIFFERENCES.hours < 24) {
		return DIFFERENCES.hours > 1
			? `${DIFFERENCES.hours} hours ago`
			: `${DIFFERENCES.hours} hour ago`;
	}

	if (DIFFERENCES.minutes > 0 && DIFFERENCES.minutes < 60) {
		return DIFFERENCES.minutes > 1
			? `${DIFFERENCES.minutes} minutes ago`
			: `${DIFFERENCES.minutes} minute ago`;
	}

	if (DIFFERENCES.seconds > 0 && DIFFERENCES.seconds < 60) {
		return DIFFERENCES.seconds > 1
			? `${DIFFERENCES.seconds} seconds ago`
			: `${DIFFERENCES.seconds} second ago`;
	}

	return "Just now";
}

export function convertTextToTimestamp(timeString: string): number {
	const timeRegex = /^(a|\d+)\s+(\w+)\s+ago$/;
	const match = timeString.match(timeRegex);

	if (!match) {
		return Date.now();
	}

	const time = match[1] === "a" ? 1 : parseInt(match[1]);
	const unit = match[2];
	const now = new Date();

	switch (unit) {
		case "second":
		case "seconds":
			now.setSeconds(now.getSeconds() - time);
			break;
		case "minute":
		case "minutes":
			now.setMinutes(now.getMinutes() - time);
			break;
		case "hour":
		case "hours":
			now.setHours(now.getHours() - time);
			break;
		case "day":
		case "days":
			now.setDate(now.getDate() - time);
			break;
		case "week":
		case "weeks":
			now.setDate(now.getDate() - time * 7);
			break;
		case "month":
		case "months":
			now.setMonth(now.getMonth() - time);
			break;
		case "year":
		case "years":
			now.setFullYear(now.getFullYear() - time);
			break;
	}
	return Math.floor(now.getTime() / 1000);
}
