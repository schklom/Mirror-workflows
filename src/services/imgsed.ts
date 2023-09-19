import {
	IGetComments,
	IGetPost,
	IGetPosts,
	IgetPostsOptions,
} from "./types/functions";
import * as cheerio from "cheerio";
import { convertTimestampToRelativeTime } from "@/utils/converters/time";
import { AxiosScraper } from "./scrapers/axios";
import { PlaywrightScraper } from "./scrapers/playwright";
import { shortcodeToMediaId } from "@/utils/id";
import { convertToInstagramUrl, proxyUrl } from "@/utils/url";
import { convertToBase64, extractTagsAndUsers } from "@/utils/text";
import { Comment, Post, PostsResponse } from "./types";
import { PostsMain } from "./wizstat";

export class Imgsed implements IGetPost, IGetPosts, IGetComments {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	private async scrapePosts(username: string): Promise<PostsResponse> {
		const html = await this.scraper.getHtml({
			path: username,
			expireTime: this.scraper.config.ttl?.posts as number,
		});
		const $ = cheerio.load(html);
		const posts: Post[] = [];

		$(".items>.item").each((_i, post) => {
			const imgContainer = $(post).find(".img");
			const img = $(imgContainer).find("a>img");
			const postUrl = $(imgContainer).find("a");
			const imageUrl = img.attr("class") === "lazy"
				? (img.attr("data-src") as string)
				: (img.attr("src") as string);

			const shortcode = postUrl
				.attr("href")
				?.split("/p/")
				.at(-1)
				?.slice(0, -1) as string;

			const item: Post = {
				id: shortcodeToMediaId(shortcode),
				shortcode,
				thumb: proxyUrl(convertToInstagramUrl(imageUrl)),
				description: img.attr("alt"),
				isSideCard: imgContainer.find("svg").length > 0,
				isVideo: imgContainer.find(".video").length > 0,
			};

			posts.push(item);
		});
		const cursor = $(".load-more").attr("data-cursor");

		return {
			posts,
			cursor: cursor ? convertToBase64(cursor) : undefined,
			hasNext: $(".load-more").length > 0,
		};
	}

	async getPosts({
		cursor,
		username,
	}: IgetPostsOptions): Promise<PostsResponse> {
		if (!cursor) {
			return await this.scrapePosts(username);
		}

		const userId = cursor?.split("_")[1];
		const type = userId ? "posts" : "tags";
		const id = userId ? userId : username.split("/").at(-1);
		const path = `api/${type}/?id=${id}&cursor=${cursor}`;
		let json: PostsMain;

		if (this.scraper instanceof AxiosScraper) {
			json = await this.scraper.getJson<PostsMain>({
				path,
				expireTime: this.scraper.config.ttl?.post as number,
			});
		} else {
			const html = await this.scraper.getHtml({
				path,
				expireTime: this.scraper.config.ttl?.post as number,
			});
			const $ = cheerio.load(html);
			json = JSON.parse($("pre").text()) as PostsMain;
		}

		const posts: Post[] = json.items.map((post) => ({
			id: shortcodeToMediaId(post.code),
			shortcode: post.code,
			description: post.alt,
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
			cursor: convertToBase64(json.cursor),
		};
	}

	async getPost(shortcode: string): Promise<Post> {
		const html = await this.scraper.getHtml({
			path: `p/${shortcode}/`,
			expireTime: this.scraper.config.ttl?.post as number,
		});
		const $ = cheerio.load(html);
		const isVideo = $(".media-wrap").data("video") ? true : false;

		const post: Post = {
			id: shortcodeToMediaId(shortcode),
			shortcode,
			author: {
				name: $(".fullname>a").text(),
				username: $(".username>a").text().replace("@", ""),
				avatar: proxyUrl(
					convertToInstagramUrl(
						$(
							".user > div:nth-child(1) > a:nth-child(1) > img:nth-child(1)",
						).attr("src") as string,
					),
				),
			},
			description: $(".desc").text(),
			...extractTagsAndUsers($(".desc").text()),
			created_at: {
				relative: convertTimestampToRelativeTime(
					Number($(".page-post").data("created")),
				),
				timestamp: Number($(".page-post").data("created")),
			},
			commentsCount: Number($(".page-post").data("comment-count")),
			isVideo,
			isSideCard: $(".swiper-pagination").length > 0,
			thumb: proxyUrl(
				convertToInstagramUrl(
					isVideo
						? ($(".media-wrap > img:nth-child(2)").attr("src") as string)
						: ($(".media-wrap > img:nth-child(1)").attr("src") as string),
				),
			),
			sidecard: [],
		};

		if (post.isSideCard) {
			$(".swiper-slide>.media-wrap").each((_i, media) => {
				const videoUrl = $(media).data("video") as string;
				const imageUrl =
					$(media).find("img").attr("class") === "lazy"
						? ($(media).find("img").data("src") as string)
						: ($(media).find("img").attr("src") as string);
				post.sidecard?.push({
					type: videoUrl ? "video" : "image",
					url: videoUrl
						? proxyUrl(videoUrl)
						: proxyUrl(convertToInstagramUrl(imageUrl)),
				});
			});
		}

		if (post.isVideo) {
			const video = $(".media-wrap").data("video") as string;
			post.video = proxyUrl(video);
		}

		return post;
	}

	async getComments(shortcode: string): Promise<Comment[]> {
		const html = await this.scraper.getHtml({
			path: `p/${shortcode}/`,
			expireTime: this.scraper.config.ttl?.post as number,
		});
		const $ = cheerio.load(html);
		const comments: Comment[] = [];
		$(".comment").each((_i, comment) => {
			const $comment = $(comment);
			comments?.push({
				username: $comment.find(".con>h2>a").text().trim(),
				avatar: proxyUrl(
					convertToInstagramUrl($comment.find("img").data("src") as string),
				),
				comment: $comment.find(".con>p").text(),
			});
		});
		return comments;
	}
}
