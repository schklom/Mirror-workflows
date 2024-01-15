import redis from "@/utils/redis";
import { env } from "env.mjs";
import { ApiError } from "next/dist/server/api-utils";
import { IGetSearch } from "@/services/types/functions";
import { HttpStatusCode } from "axios";
import { getRandomProvider } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { NextApiRequest, NextApiResponse } from "next";

async function search(req: NextApiRequest, res: NextApiResponse) {
	const q = req.query.q as string | undefined;
	const expireTime = convertTTlToTimestamp(env.EXPIRE_TIME_FOR_PROFILE);

	const cachedData = await redis.get(`search:#${q}`);
	if (cachedData) {
		return res.json(JSON.parse(cachedData));
	}

	if (!q) {
		throw new ApiError(HttpStatusCode.BadRequest, "You should provide a query");
	}

	try {
		const url = new URL(q);
		res.redirect(url.pathname);
	} catch (error) {
		const searchService = await getRandomProvider<IGetSearch>("Search");
		const searchInfo = await searchService.search(q);

		await redis.setex(`search:${q}`, expireTime, JSON.stringify(searchInfo));
		res.json(searchInfo);
	}
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
	await withExeptionFilter(req, res)(search);
}
