import redis from "@/utils/redis";
import { env } from "env.mjs";
import { ApiError } from "next/dist/server/api-utils";
import { IGetPosts } from "@/services/types/functions";
import { PostsResponse } from "@/services/types";
import { HttpStatusCode } from "axios";
import { convertFromBase64 } from "@/utils/text";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { usernameQueryScheme } from ".";
import { getRandomFilteredProvider, getRandomProvider } from "@/services";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { NextApiRequest, NextApiResponse } from "next";

async function getPosts(req: NextApiRequest, res: NextApiResponse<PostsResponse>) {
	const query = usernameQueryScheme.safeParse(req.query);
	const cursorBase64 = req.query.cursor as string | undefined;
	const expireTime = convertTTlToTimestamp(env.EXPIRE_TIME_FOR_POSTS);

	if (!query.success) {
		throw new ApiError(HttpStatusCode.BadRequest, query.error.errors[0].message);
	}

	if (query.data.username === "favicon.ico") {
		return res.end();
	}

	if (cursorBase64) {
		const cursor = convertFromBase64(cursorBase64);
		const [postId, userId] = cursor.split("_");

		if (!isNaN(Number(userId))) {
			const cachedData = await redis.get(
				`profile:${query.data.username}:cursor:${cursorBase64}`,
			);
			if (cachedData) {
				return res.json(JSON.parse(cachedData));
			}

			const providerPosts = await getRandomFilteredProvider<IGetPosts>((provider) =>
				["Wizstat", "Imgsed"].includes(provider.provider),
			);
			const posts = await providerPosts.getPosts({
				username: query.data.username,
				cursor,
			});
			await redis.setex(
				`profile:${query.data.username}:posts:cursor:${cursorBase64}`,
				expireTime,
				JSON.stringify(posts),
			);
			return res.json(posts);
		} else if (!isNaN(Number(postId)) && typeof userId === "undefined") {
			const cachedData = await redis.get(
				`profile:${query.data.username}:cursor:${cursorBase64}`,
			);
			if (cachedData) {
				return res.json(JSON.parse(cachedData));
			}

			const providerPosts = await getRandomFilteredProvider<IGetPosts>(
				(provider) => provider.provider === "Greatfon",
			);
			const posts = await providerPosts.getPosts({
				username: query.data.username,
				cursor,
			});
			await redis.setex(
				`profile:${query.data.username}:posts:cursor:${cursorBase64}`,
				expireTime,
				JSON.stringify(posts),
			);
			return res.json(posts);
		} else {
			const cachedData = await redis.get(
				`profile:${query.data.username}:cursor:${cursorBase64}`,
			);
			if (cachedData) {
				return res.json(JSON.parse(cachedData));
			}

			const providerPosts = await getRandomFilteredProvider<IGetPosts>((provider) =>
				["Iganony"].includes(provider.provider),
			);
			const posts = await providerPosts.getPosts({
				username: query.data.username,
				cursor,
			});
			await redis.setex(
				`profile:${query.data.username}:posts:cursor:${cursorBase64}`,
				expireTime,
				JSON.stringify(posts),
			);
			return res.json(posts);
		}
	}

	const cachedData = await redis.get(`profile:${query.data.username}:posts`);
	if (cachedData) {
		return res.json(JSON.parse(cachedData));
	}

	const randomPostsProvider = await getRandomProvider<IGetPosts>("Posts");
	const posts = await randomPostsProvider.getPosts({
		username: query.data.username,
	});
	await redis.setex(`profile:${query.data.username}:posts`, expireTime, JSON.stringify(posts));
	res.json(posts);
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
	await withExeptionFilter(req, res)(getPosts);
}
