import { IGetSearch } from "@/services";
import { getRandomProvider } from "@/utils";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { HttpStatusCode } from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { ApiError } from "next/dist/server/api-utils";

async function search(req: NextApiRequest, res: NextApiResponse) {
	const q = req.query.q as string;
	const searchService = await getRandomProvider<IGetSearch>("Tags");

	if (!search) {
		throw new ApiError(HttpStatusCode.BadRequest, "You should provide a query");
	}

	const searchInfo = await searchService.search(q);
	res.json(searchInfo);
}

export default async function apiHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await withExeptionFilter(req, res)(search);
}
