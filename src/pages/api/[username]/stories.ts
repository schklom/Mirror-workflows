import redis from "@/utils/redis";
import { env } from "env.mjs";
import { Story } from "@/services/types";
import { ApiError } from "next/dist/server/api-utils";
import { IGetStories } from "@/services/types/functions";
import { HttpStatusCode } from "axios";
import { getRandomProvider } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { usernameQueryScheme } from ".";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { NextApiRequest, NextApiResponse } from "next";

async function getStories(req: NextApiRequest, res: NextApiResponse<Story[]>) {
	const query = usernameQueryScheme.safeParse(req.query);
	const expireTime = convertTTlToTimestamp(env.EXPIRE_TIME_FOR_STORIES);

	if (!query.success) {
		throw new ApiError(HttpStatusCode.BadRequest, query.error.errors[0].message);
	}

	if (query.data.username === "favicon.ico") {
		return res.end();
	}
	const cachedData = await redis.get(`profile:${query.data.username}:stories`);
	if (cachedData) {
		return res.json(JSON.parse(cachedData));
	}

	const randomStoriesProvider = await getRandomProvider<IGetStories>("Stories");
	const stories = await randomStoriesProvider.getStories(query.data.username);
	await redis.setex(
		`profile:${query.data.username}:stories`,
		expireTime,
		JSON.stringify(stories),
	);
	res.json(stories);
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
	await withExeptionFilter(req, res)(getStories);
}
