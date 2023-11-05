import redis from "@/utils/redis";
import { env } from "env.mjs";
import { Post } from "@/services/types";
import { IGetPost } from "@/services/types/functions";
import { getRandomProvider } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { NextApiRequest, NextApiResponse } from "next";

async function getPost(req: NextApiRequest, res: NextApiResponse<Post>) {
	const shortcode = req.query.shortcode as string;
	const expireTime = convertTTlToTimestamp(env.EXPIRE_TIME_FOR_POST);

	const cachedData = await redis.get(`p:${shortcode}`);
	if (cachedData) {
		return res.json(JSON.parse(cachedData));
	}

	const randomProvider = await getRandomProvider<IGetPost>("Post");
	const post = await randomProvider.getPost(shortcode);
	await redis.setex(`p:${shortcode}`, expireTime, JSON.stringify(post));
	return res.json(post);
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
	await withExeptionFilter(req, res)(getPost);
}
