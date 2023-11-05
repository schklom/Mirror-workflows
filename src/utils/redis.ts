import { Redis } from "ioredis";

let redis: Pick<Redis, "get" | "setex" | "set"> = {
	get: async (key) => Promise.resolve(null),
	setex: async (key: string, seconds: number, value: unknown) => Promise.resolve("OK"),
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

export default redis;
