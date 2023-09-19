import type { NextApiRequest, NextApiResponse } from "next";
import { ApiError } from "next/dist/server/api-utils";
import { IGetStories } from "@/services/types/functions";
import { HttpStatusCode } from "axios";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { usernameQueryScheme } from ".";
import { getRandomProvider } from "@/services";
import { Story } from "@/services/types";

async function getPosts(req: NextApiRequest, res: NextApiResponse<Story[]>) {
	const query = usernameQueryScheme.safeParse(req.query);

	if (!query.success) {
		throw new ApiError(
			HttpStatusCode.BadRequest,
			query.error.errors[0].message,
		);
	}

	if (query.data.username === "favicon.ico") {
		return res.end();
	}

	const randomStoriesProvider = await getRandomProvider<IGetStories>("Stories");
	const stories = await randomStoriesProvider.getStories(query.data.username);
	res.json(stories);
}

export default async function apiHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await withExeptionFilter(req, res)(getPosts);
}
