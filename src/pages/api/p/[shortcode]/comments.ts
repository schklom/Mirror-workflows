import redis from "@/utils/redis";
import { env } from "env.mjs";
import { Comment } from "@/services/types";
import { IGetComments } from "@/services/types/functions";
import { getRandomProvider } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { NextApiRequest, NextApiResponse } from "next";

async function getComments(req: NextApiRequest, res: NextApiResponse<Comment[]>) {
	const shortcode = req.query.shortcode as string;
	const expireTime = convertTTlToTimestamp(env.EXPIRE_TIME_FOR_POST);

	const cachedData = await redis.get(`p:${shortcode}:comments`);
	if (cachedData) {
		return res.json(JSON.parse(cachedData));
	}

	const randomProvider = await getRandomProvider<IGetComments>("Comments");
	const comments = await randomProvider.getComments(shortcode);
	await redis.setex(`p:${shortcode}:comments`, expireTime, JSON.stringify(comments));
	return res.json(comments);
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
	await withExeptionFilter(req, res)(getComments);
}
