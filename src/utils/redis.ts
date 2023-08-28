import { Redis } from "ioredis";

let redis: Pick<Redis, "get" | "setex" | "set"> = {
	get: async (key) => Promise.resolve(null),
	setex: async (key: string, seconds: number, value: unknown) =>
		Promise.resolve("OK"),
	set: async (key: string, value: unknown) => Promise.resolve("OK"),
};

if (process.env.CACHE === "true" && process.env.REDIS_URL) {
	redis = new Redis(process.env.REDIS_URL, {
		lazyConnect: true,
		maxRetriesPerRequest: 0,
	});
	const r = redis as Redis;

	r.on("connect", () => console.log("Redis connected"));
	r.on("error", () => {
		throw new Error("Redis could not connect");
	});
}

type MIDDLE_POSITION_PATH = "p" | "c" | "t" | "tags" | "profile";

export default redis;
export function createRedisKeyFromUrl(url: string) {
	const urlObj = new URL(url);

	let LAST_POSITION_PATH = urlObj.pathname
		.split("/")
		.filter((e) => e !== "")
		.at(-1);
	const MIDDLE_POSITION_PATH = urlObj.pathname
		.split("/")
		.filter((e) => e !== "")
		.at(-2) as MIDDLE_POSITION_PATH;
	const START_POSITION_PATH = urlObj.pathname
		.split("/")
		.filter((e) => e !== "")
		.at(-3);

	let DIR: string;

	switch (MIDDLE_POSITION_PATH) {
		case "p":
		case "c":
			DIR = "p";
			break;
		case "t":
		case "tags":
			DIR = "tag";
			break;
		default:
			DIR = "profile";
	}

	switch (LAST_POSITION_PATH) {
		case "info":
			LAST_POSITION_PATH = "profile";
	}

	switch (START_POSITION_PATH) {
		case "api":
			DIR = "api";
	}

	const DOMAIN_NAME = urlObj.host;
	const CURSOR =
		urlObj.searchParams.get("cursor") ?? urlObj.searchParams.get("after");
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
