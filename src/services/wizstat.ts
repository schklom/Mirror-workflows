import {
	IGetComments,
	IGetPost,
	IGetPosts,
	IGetProfile,
	IgetPostsOptions,
} from "./types/functions";
import {
	convertTextToTimestamp,
	convertTimestampToRelativeTime,
} from "@/utils/converters/time";
import * as cheerio from "cheerio";
import { AxiosScraper } from "./scrapers/axios";
import { PlaywrightScraper } from "./scrapers/playwright";
import { shortcodeToMediaId } from "@/utils/id";
import { convertToInstagramUrl, proxyUrl } from "@/utils/url";
import {
	convertToBase64,
	extractTagsAndUsers,
	stripHtmlTags,
} from "@/utils/text";
import { Comment, Post, PostsResponse, Profile } from "./types";
import { compactToNumber } from "@/utils/converters/numbers";

export interface PostsMain {
	code: number;
	items: WizstatPost[];
	hasNext: boolean;
	cursor: string;
}

interface WizstatPost {
	id: string;
	alt: string;
	isVideo: boolean;
	isSidecar: boolean;
	thumb: string;
	time: number;
	src: string;
	code: string;
}

export class Wizstat implements IGetProfile, IGetPost, IGetPosts, IGetComments {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	private async scrapePosts(username: string): Promise<PostsResponse> {
		const html = await this.scraper.getHtml({ path: `${username}/` });
		const $ = cheerio.load(html);
		const posts: Post[] = [];

		$(".post-items>.post-item").each((_i, post) => {
			const img = $(post).find("img");

			const shortcode = $(post)
				.find(".img")
				.attr("href")
				?.slice(3, -1) as string;

			const item: Post = {
				id: shortcodeToMediaId(shortcode),
				shortcode,
				thumb: proxyUrl(convertToInstagramUrl(img.attr("src") as string)),
				description: img.attr("alt")?.trim(),
				isVideo: false,
				isSideCard: false,
			};

			posts.push(item);
		});

		const cursor = $(".more-posts").attr("data-cursor");

		return {
			posts,
			cursor: cursor ? convertToBase64(cursor) : undefined,
			hasNext: $(".end").length > 0,
		};
	}

	async getProfile(username: string): Promise<Profile> {
		const html = await this.scraper.getHtml({ path: `${username}/` });
		const $ = cheerio.load(html);

		return {
			id: Number($(".more-posts").data("id")),
			username: $(".name").attr("href")?.replaceAll("/", "") as string,
			profilePicture: proxyUrl(
				convertToInstagramUrl($(".avatar").find("img").attr("src") as string),
			),
			isPrivate: $(".private-account").length > 0,
			fullname: $(".nickname").text(),
			biography: $(".bio").text(),
			...extractTagsAndUsers($(".bio").text().trim() as string),
			mediaCount: Number($(".posts>span").text()),
			followers: compactToNumber($(".followers>span").text()),
			following: compactToNumber($(".following>span").text()),
		};
	}

	async getPosts({
		cursor,
		username,
	}: IgetPostsOptions): Promise<PostsResponse> {
		if (!cursor) {
			return await this.scrapePosts(username);
		}

		const userId = cursor.split("_")[1];
		const type = userId ? "posts" : "tag";
		const id = userId ? userId : username.split("/").at(-1);
		const path = `api/${type}/?id=${id}&cursor=${cursor}`;
		let json: PostsMain;

		if (this.scraper instanceof AxiosScraper) {
			json = await this.scraper.getJson<PostsMain>({ path });
		} else {
			const html = await this.scraper.getHtml({ path });
			const $ = cheerio.load(html);
			json = JSON.parse($("pre").text()) as PostsMain;
		}

		const posts: Post[] = json.items.map((post) => ({
			id: shortcodeToMediaId(post.code),
			shortcode: post.code,
			description: post.alt.trim(),
			thumb: proxyUrl(convertToInstagramUrl(post.thumb)),
			isVideo: post.isVideo,
			isSideCard: post.isSidecar,
			created_at: {
				relative: convertTimestampToRelativeTime(post.time),
				timestamp: post.time,
			},
		}));

		return {
			posts: posts,
			hasNext: json.hasNext,
			cursor: json.cursor ? convertToBase64(json.cursor) : undefined,
		};
	}

	async getPost(shortcode: string): Promise<Post> {
		const html = await this.scraper.getHtml({ path: `p/${shortcode}/` });
		const $ = cheerio.load(html);

		const post: Post = {
			id: shortcodeToMediaId(shortcode),
			shortcode,
			author: {
				name: $(".nickname").text(),
				username: $(".name").text().split(" ")[0].slice(1).trim(),
				avatar: proxyUrl(
					convertToInstagramUrl(
						$(".user-info").find("img").attr("src") as string,
					),
				),
			},
			description: stripHtmlTags($(".desc").html() as string),
			...extractTagsAndUsers($(".desc").text().trim()),
			created_at: {
				relative: convertTimestampToRelativeTime(
					convertTextToTimestamp($(".date").text()),
				),
				timestamp: convertTextToTimestamp($(".date").text()),
			},
			thumb: proxyUrl(
				convertToInstagramUrl(
					($(".media-wrap").find("img").data("src") as string) ||
						($(".media-wrap").find("img").attr("src") as string),
				),
			),
			isVideo: $(".media-wrap").attr("href") ? true : false,
			isSideCard: $(".swiper-wrapper").length > 0,
			sidecard: [],
		};

		if (post.isSideCard) {
			$(".swiper-slide").each((_i, el) => {
				const isVideo = $(el).find(".media-wrap").is("a");
				post.sidecard?.push({
					type: isVideo ? "video" : "image",
					url: isVideo
						? proxyUrl(
								convertToInstagramUrl(
									$(el).find(".media-wrap").attr("href") as string,
								),
						  )
						: proxyUrl(
								convertToInstagramUrl(
									$(el).find(".media-wrap").find("img").attr("src") ||
										($(el)
											.find(".media-wrap")
											.find("img")
											.data("src") as string),
								),
						  ),
				});
			});
		}

		if (post.isVideo) {
			const video = $(".media-wrap").attr("href") as string;
			post.video = proxyUrl(video);
		}

		return post;
	}

	async getComments(shortcode: string): Promise<Comment[]> {
		const html = await this.scraper.getHtml({ path: `p/${shortcode}/` });
		const $ = cheerio.load(html);
		const comments: Comment[] = [];

		$(".comment").each((_i, comment) => {
			const $comment = $(comment);
			comments?.push({
				username: $comment.find(".userinfo>.name").text().replace("@", ""),
				avatar: proxyUrl(
					convertToInstagramUrl(
						$comment.find(".userinfo>.img>img").attr("src") as string,
					),
				),
				comment: $comment.find(".text").text().trim(),
				created_at: convertTextToTimestamp($(comment).find(".time").text()),
			});
		});

		return comments;
	}
}
