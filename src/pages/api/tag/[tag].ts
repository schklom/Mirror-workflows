import redis from "@/utils/redis";
import { env } from "env.mjs";
import { IGetTag } from "@/services/types/functions";
import { TagResponse } from "@/services/types";
import { getRandomProvider } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { convertTTlToTimestamp } from "@/utils/converters/time";
import { NextApiRequest, NextApiResponse } from "next";

async function getTag(req: NextApiRequest, res: NextApiResponse<TagResponse>) {
	const tag = req.query.tag as string;
	const expireTime = convertTTlToTimestamp(env.EXPIRE_TIME_FOR_PROFILE);

	const cachedData = await redis.get(`tag:${tag}`);
	if (cachedData) {
		return res.json(JSON.parse(cachedData));
	}

	const randomTagProvider = await getRandomProvider<IGetTag>("Tags");
	const tagInfo = await randomTagProvider.getTag({ tag });
	await redis.setex(`tag:${tag}`, expireTime, JSON.stringify(tagInfo));
	res.json(tagInfo);
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
	await withExeptionFilter(req, res)(getTag);
}
