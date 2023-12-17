import * as cheerio from "cheerio";
import { axiosInstance } from "@/utils";
import { proxyUrl } from "@/utils/url";
import { AxiosScraper } from "./scrapers/axios";
import { PlaywrightScraper } from "./scrapers/playwright";
import { Post, PostsResponse, Profile } from "./types";
import { convertToBase64 } from "@/utils/text";
import { shortcodeToMediaId } from "@/utils/id";
import { IGetPosts, IgetPostsOptions } from "./types/functions";

export class StoriesDown implements IGetPosts {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	async getPosts({ username }: IgetPostsOptions): Promise<PostsResponse> {
		const [html, { data: profile }] = await Promise.all([
			this.scraper.getHtml({ path: `?ig=${username}` }),
			axiosInstance.get<Profile>(username),
		]);
		const $ = cheerio.load(html);

		let posts: Post[] = [];

		$("#Post")
			.find("div > div > center")
			.each((_i, post) => {
				if (post.parent) {
					if (post.parent.children.filter((ch) => ch.type === "tag").length > 1) {
						return;
					}
				}
				const $imgs = $(post).find("img");
				const $viewPost = $(post).find("a");
				const postIgUrl = String($viewPost.first().attr("href"));

				const isVideo = !!$(post).next().find("a").attr("href")?.endsWith(".mp4");
				let imgUrl: string = "";

				const urlParams = new URLSearchParams($imgs.first().attr("src"));
				const firstKey = Array.from(urlParams.keys())[0];
				urlParams.delete(firstKey);
				for (const [key, value] of urlParams.entries()) {
					if (key === "q") {
						imgUrl += value;
					} else {
						imgUrl += `&${key}=${value}`;
					}
				}

				const shortcode = new URL(postIgUrl).pathname.slice(3);

				posts.push({
					id: shortcodeToMediaId(shortcode),
					shortcode,
					thumb: proxyUrl(imgUrl),
					isVideo,
				});
			});

		const lastPost = posts.at(-1);
		const hasNext = profile.mediaCount > 12;
		const hasCursor = hasNext && !!lastPost;

		return {
			posts,
			cursor: hasCursor ? convertToBase64(lastPost.id) : undefined,
			hasNext,
		};
	}
}
