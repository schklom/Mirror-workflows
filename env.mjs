import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		URL: z.string().url(),
		RSS: z
			.string()
			.refine((s) => s === "true" || s === "false")
			.transform((s) => s === "true"),
		CACHE: z
			.string()
			.refine((s) => s === "true" || s === "false")
			.transform((s) => s === "true"),
		PROXY: z
			.string()
			.refine((s) => s === "true" || s === "false")
			.transform((s) => s === "true"),
		REDIS_URL: z.string().url(),
		ITEMS_PER_RSS: z
			.string()
			.transform((s) => parseInt(s, 10))
			.pipe(z.number().max(12)),
		FETCH_PROVIDERS: z
			.string()
			.refine((s) => s === "true" || s === "false")
			.transform((s) => s === "true"),
		PROVIDERS_LIST_URL: z.string().url(),
		EXPIRE_TIME_FOR_RSS: z
			.string()
			.min(2)
			.regex(/[dmh]$/i)
			.regex(/[dmh]$/i),
		EXPIRE_TIME_FOR_POST: z
			.string()
			.min(2)
			.regex(/[dmh]$/i),
		FETCH_PROVIDERS_EVERY: z
			.string()
			.min(2)
			.regex(/[dmh]$/i),
		EXPIRE_TIME_FOR_POSTS: z
			.string()
			.min(2)
			.regex(/[dmh]$/i),
		SLEEP_TIME_PER_REQUEST: z
			.string()
			.transform((s) => parseInt(s, 10))
			.pipe(z.number()),
		USE_HEADLESS_PROVIDERS: z
			.string()
			.refine((s) => s === "true" || s === "false")
			.transform((s) => s === "true"),
		EXPIRE_TIME_FOR_STORIES: z
			.string()
			.min(2)
			.regex(/[dmh]$/i),
		EXPIRE_TIME_FOR_PROFILE: z
			.string()
			.min(2)
			.regex(/[dmh]$/i),
	},
	runtimeEnv: {
		URL: process.env.URL,
		RSS: process.env.RSS,
		CACHE: process.env.CACHE,
		PROXY: process.env.PROXY,
		REDIS_URL: process.env.REDIS_URL,
		ITEMS_PER_RSS: process.env.ITEMS_PER_RSS,
		FETCH_PROVIDERS: process.env.FETCH_PROVIDERS,
		PROVIDERS_LIST_URL: process.env.PROVIDERS_LIST_URL,
		EXPIRE_TIME_FOR_RSS: process.env.EXPIRE_TIME_FOR_RSS,
		EXPIRE_TIME_FOR_POST: process.env.EXPIRE_TIME_FOR_POST,
		FETCH_PROVIDERS_EVERY: process.env.FETCH_PROVIDERS_EVERY,
		EXPIRE_TIME_FOR_POSTS: process.env.EXPIRE_TIME_FOR_POSTS,
		SLEEP_TIME_PER_REQUEST: process.env.SLEEP_TIME_PER_REQUEST,
		USE_HEADLESS_PROVIDERS: process.env.USE_HEADLESS_PROVIDERS,
		EXPIRE_TIME_FOR_STORIES: process.env.EXPIRE_TIME_FOR_STORIES,
		EXPIRE_TIME_FOR_PROFILE: process.env.EXPIRE_TIME_FOR_PROFILE,
	},
});
