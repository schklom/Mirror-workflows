import type { NextApiRequest, NextApiResponse } from "next";
import { ApiError } from "next/dist/server/api-utils";
import { IGetPosts } from "@/services/types/functions";
import { PostsResponse } from "@/services/types";
import { HttpStatusCode } from "axios";
import { convertFromBase64 } from "@/utils/text";
import { withExeptionFilter } from "@/utils/withExceptionFilter";
import { usernameQueryScheme } from ".";
import { getRandomFilteredProvider, getRandomProvider } from "@/services";

async function getPosts(
	req: NextApiRequest,
	res: NextApiResponse<PostsResponse>,
) {
	const query = usernameQueryScheme.safeParse(req.query);
	const cursorBase64 = req.query.cursor as string | undefined;

	if (!query.success) {
		throw new ApiError(
			HttpStatusCode.BadRequest,
			query.error.errors[0].message,
		);
	}

	if (query.data.username === "favicon.ico") {
		return res.end();
	}

	if (cursorBase64) {
		const cursor = convertFromBase64(cursorBase64);
		const [postId, userId] = cursor.split("_");

		if (!isNaN(Number(userId))) {
			const providerPosts = await getRandomFilteredProvider<IGetPosts>(
				(provider) => ["Wizstat", "Imgsed"].includes(provider.provider),
			);

			const posts = await providerPosts.getPosts({
				username: query.data.username,
				cursor,
			});
			return res.json(posts);
		} else if (!isNaN(Number(postId)) && typeof userId === "undefined") {
			const providerPosts = await getRandomFilteredProvider<IGetPosts>(
				(provider) => provider.provider === "Greatfon",
			);
			const posts = await providerPosts.getPosts({
				username: query.data.username,
				cursor,
			});
			return res.json(posts);
		} else {
			const providerPosts = await getRandomFilteredProvider<IGetPosts>(
				(provider) => ["Iganony"].includes(provider.provider),
			);

			const posts = await providerPosts.getPosts({
				username: query.data.username,
				cursor,
			});
			return res.json(posts);
		}
	}

	const randomPostsProvider = await getRandomProvider<IGetPosts>("Posts");
	const posts = await randomPostsProvider.getPosts({
		username: query.data.username,
	});
	res.json(posts);
}

export default async function apiHandler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	await withExeptionFilter(req, res)(getPosts);
}
