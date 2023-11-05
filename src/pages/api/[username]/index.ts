import redis from "@/utils/redis";
import { z } from "zod";
import { env } from "env.mjs";
import { ApiError } from "next/dist/server/api-utils";
import { IGetProfile } from "@/services/types/functions";
import { HttpStatusCode } from "axios";
import { getRandomProvider } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { NextApiRequest, NextApiResponse } from "next";

export const usernameQueryScheme = z.object({
	username: z.string().min(1).max(30),
});

async function getProfile(req: NextApiRequest, res: NextApiResponse) {
	const query = usernameQueryScheme.safeParse(req.query);
	const expireTime = convertTTlToTimestamp(env.EXPIRE_TIME_FOR_PROFILE);

	if (!query.success) {
		throw new ApiError(HttpStatusCode.BadRequest, query.error.errors[0].message);
	}
	if (query.data.username === "favicon.ico") {
		return res.end();
	}

	const cachedData = await redis.get(`profile:${query.data.username}`);
	if (cachedData) {
		return res.json(JSON.parse(cachedData));
	}

	const randomProvider = await getRandomProvider<IGetProfile>("Profile");
	const profile = await randomProvider.getProfile(query.data.username);
	await redis.setex(`profile:${query.data.username}`, expireTime, JSON.stringify(profile));
	res.json(profile);
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
	await withExeptionFilter(req, res)(getProfile);
}
