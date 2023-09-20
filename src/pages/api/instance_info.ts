import { getGitHash } from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";

export default async function getInstanceInfo(
	_req: NextApiRequest,
	res: NextApiResponse,
) {
	res.json({
		url: process.env.URL,
		version: getGitHash(),
		rss_enabled: process.env.RSS === "true",
		cache_enabled: process.env.CACHE === "true",
		proxy_enabled: process.env.PROXY === "true",
		items_per_rss: Number(process.env.ITEMS_PER_RSS),
		headless_providers: process.env.USE_HEADLESS_PROVIDERS === "true",
		sleep_time_per_request: `${process.env.SLEEP_TIME_PER_REQUEST}ms`,
		list_of_providers_using: process.env.PROVIDERS_LIST_URL,
		fetching_providers_every: process.env.FETCH_PROVIDERS_EVERY,
	});
}
