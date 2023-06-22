import type { Comment, IGetComments } from "@/services";
import { getRandomProvider } from "@/utils";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import type { NextApiRequest, NextApiResponse } from "next";

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
