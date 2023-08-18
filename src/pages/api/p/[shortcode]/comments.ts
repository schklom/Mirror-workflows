import type { NextApiRequest, NextApiResponse } from "next";
import { Comment } from "@/services/types";
import { IGetComments } from "@/services/types/functions";
import { getRandomProvider } from "@/services";
import { withExeptionFilter } from "@/utils/withExceptionFilter";

async function getComments(
	req: NextApiRequest,
	res: NextApiResponse<Comment[]>,
) {
	const randomProvider = await getRandomProvider<IGetComments>("Comments");

	const comments = await randomProvider.getComments(
		req.query.shortcode as string,
	);
	return res.json(comments);
}

export default async function apiHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await withExeptionFilter(req, res)(getComments);
}
