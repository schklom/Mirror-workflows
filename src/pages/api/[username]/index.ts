import { IGetProfile } from "@/services";
import { getRandomProvider } from "@/utils";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { HttpStatusCode } from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { ApiError } from "next/dist/server/api-utils";
import { z } from "zod";

export const usernameQueryScheme = z.object({
	username: z.string().min(1).max(30),
});

async function getProfile(req: NextApiRequest, res: NextApiResponse) {
	const query = usernameQueryScheme.safeParse(req.query);
	const randomProvider = await getRandomProvider<IGetProfile>("Profile");

	if (!query.success) {
		throw new ApiError(
			HttpStatusCode.BadRequest,
			query.error.errors[0].message,
		);
	}
	if (query.data.username === "favicon.ico") {
		return res.end();
	}

	const profile = await randomProvider.getProfile(query.data.username);
	res.json(profile);
}

export default async function apiHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await withExeptionFilter(req, res)(getProfile);
}
