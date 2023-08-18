import { IGetTag } from "@/services/types/functions";
import { ApiError } from "next/dist/server/api-utils";
import { TagResponse } from "@/services/types";
import { HttpStatusCode } from "axios";
import { getRandomProvider } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import type { NextApiRequest, NextApiResponse } from "next";

async function getTag(req: NextApiRequest, res: NextApiResponse<TagResponse>) {
	const tag = req.query.tag as string | undefined;
	const randomTagProvider = await getRandomProvider<IGetTag>("Tags");

	if (!tag) {
		throw new ApiError(HttpStatusCode.BadRequest, "You should provide a tag");
	}

	const tagInfo = await randomTagProvider.getTag({ tag });
	res.json(tagInfo);
}

export default async function apiHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await withExeptionFilter(req, res)(getTag);
}
