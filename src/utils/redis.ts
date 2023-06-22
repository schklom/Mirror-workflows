import { Redis } from "ioredis";

const redis = new Redis({
	lazyConnect: true,
	maxRetriesPerRequest: 0,
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", () => {
	throw new Error("Redis could not connect");
});

export default redis;
