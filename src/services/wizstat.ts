import {
	IGetComments,
	IGetPost,
	IGetPosts,
	IGetProfile,
	IgetPostsOptions,
} from "./types/functions";
import { convertTextToTimestamp, convertTimestampToRelativeTime } from "@/utils/converters/time";
import * as cheerio from "cheerio";
import { AxiosScraper } from "./scrapers/axios";
import { PlaywrightScraper } from "./scrapers/playwright";
import { shortcodeToMediaId } from "@/utils/id";
import { convertToInstagramUrl, proxyUrl } from "@/utils/url";
import { convertToBase64, extractTagsAndUsers, stripHtmlTags } from "@/utils/text";
import { Comment, Post, PostsResponse, Profile } from "./types";
import { compactToNumber } from "@/utils/converters/numbers";
import { fetchJSON } from "@/utils/fetch";

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

const isVideoSvg = `<path d="M26.1 0L33 11.52H19.6L13.6.1a13.42 13.42 0 012.1-.1h10.4zM9.9.7l5.8 10.82H.4A13.09 13.09 0 014.1 4 12 12 0 019.9.7zM30.1 0h1.6c6 0 9.3 1.2 12.2 4.11a12.51 12.51 0 013.7 7.41H37zm1.7 29.06l-11.2-6.51A1.72 1.72 0 0018 24v13.08a1.79 1.79 0 002.5 1.6l.1-.1 11.2-6.51a1.7 1.7 0 00.1-2.91l-.1-.1-11.2-6.51zM0 15h48v16.77c0 6-1.2 9.32-4.1 12.22-2.8 2.71-6 4-11.7 4h-16c-6 0-9.3-1.2-12.2-4.11-2.7-2.8-4-6-4-11.72V15z"></path>`;
const isSideCardSvg = `<path d="M34.8 29.7V11c0-2.9-2.3-5.2-5.2-5.2H11c-2.9 0-5.2 2.3-5.2 5.2v18.7c0 2.9 2.3 5.2 5.2 5.2h18.7c2.8-.1 5.1-2.4 5.1-5.2zM39.2 15v16.1c0 4.5-3.7 8.2-8.2 8.2H14.9c-.6 0-.9.7-.5 1.1 1 1.1 2.4 1.8 4.1 1.8h13.4c5.7 0 10.3-4.6 10.3-10.3V18.5c0-1.6-.7-3.1-1.8-4.1-.5-.4-1.2 0-1.2.6z"></path>`;

export class Wizstat implements IGetProfile, IGetPost, IGetPosts, IGetComments {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	private async scrapePosts(username: string): Promise<PostsResponse> {
		const html = await this.scraper.getHtml({ path: `${username}/` });
		const $ = cheerio.load(html);
		const posts: Post[] = [];

		$(".post-items>.post-item").each((_i, post) => {
			const img = $(post).find("img");

			const shortcode = $(post).find(".img").attr("href")?.slice(3, -1) as string;

			const item: Post = {
				id: shortcodeToMediaId(shortcode),
				shortcode,
				thumb: proxyUrl(convertToInstagramUrl(img.attr("src") as string)),
				description: img.attr("alt")?.trim(),
				isVideo: $(post).find(".img>svg").html() === isVideoSvg,
				isSideCard: $(post).find(".img>svg").html() === isSideCardSvg,
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

	async getPosts({ cursor, username }: IgetPostsOptions): Promise<PostsResponse> {
		if (!cursor) {
			return await this.scrapePosts(username);
		}

		const userId = cursor.split("_")[1];
		const type = userId ? "posts" : "tag";
		const id = userId ? userId : username.split("/").at(-1);
		const path = `api/${type}/?id=${id}&cursor=${cursor}`;
		const json = await fetchJSON<PostsMain>({ path, scraper: this.scraper });

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
					convertToInstagramUrl($(".user-info").find("img").attr("src") as string),
				),
			},
			description: stripHtmlTags($(".desc").html() as string),
			...extractTagsAndUsers($(".desc").text().trim()),
			created_at: {
				relative: convertTimestampToRelativeTime(convertTextToTimestamp($(".date").text())),
				timestamp: convertTextToTimestamp($(".date").text()),
			},
			thumb: proxyUrl(
				convertToInstagramUrl(
					($(".media-wrap").find("img").data("src") as string) ||
						($(".media-wrap").find("img").attr("src") as string) ||
							($(".media-wrap").find("video").attr("poster") as string),
				),
			),
			isVideo: $(".media-wrap.media-video video").attr("src") ? true : false,
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
			const video = $(".media-wrap").find("video").attr("src") as string;
			post.video = proxyUrl(convertToInstagramUrl(video));
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
