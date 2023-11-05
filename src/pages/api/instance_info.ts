import { env } from "env.mjs";
import { getGitHash } from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";

export default async function getInstanceInfo(_req: NextApiRequest, res: NextApiResponse) {
	res.json({
		url: env.URL,
		version: getGitHash(),
		rss_enabled: env.RSS,
		cache_enabled: env.CACHE,
		proxy_enabled: env.PROXY,
		items_per_rss: env.ITEMS_PER_RSS,
		headless_providers: env.USE_HEADLESS_PROVIDERS,
		sleep_time_per_request: `${env.SLEEP_TIME_PER_REQUEST}ms`,
		list_of_providers_using: env.PROVIDERS_LIST_URL,
		expire_time_for_rss: env.EXPIRE_TIME_FOR_RSS,
		expire_time_for_post: env.EXPIRE_TIME_FOR_POST,
		expire_time_for_posts: env.EXPIRE_TIME_FOR_POSTS,
		expire_time_for_profile: env.EXPIRE_TIME_FOR_PROFILE,
		expire_time_for_stories: env.EXPIRE_TIME_FOR_STORIES,
		fetching_providers_every: env.FETCH_PROVIDERS_EVERY,
	});
}
