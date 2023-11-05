import * as cheerio from "cheerio";
import { env } from "env.mjs";
import { sleep } from "@/utils";
import { proxyUrl } from "@/utils/url";
import { AxiosScraper } from "./scrapers/axios";
import { compactToNumber } from "@/utils/converters/numbers";
import { PlaywrightScraper } from "./scrapers/playwright";
import { mediaIdToShortcode, shortcodeToMediaId } from "@/utils/id";
import { IGetAll, IGetTagOptions, IgetPostsOptions } from "./types/functions";
import { Comment, Post, PostsResponse, Profile, Tag } from "./types";
import {
	stripHtmlTags,
	reverseString,
	extractTagsAndUsers,
	replaceBrWithNewline,
	convertToBase64,
} from "@/utils/text";
import { convertTextToTimestamp, convertTimestampToRelativeTime } from "@/utils/converters/time";

export interface ResultsQuery {
	accounts: {
		username: string;
		profilePicture: string;
	}[];
	hashtags: {
		tag: string;
	}[];
}

export class Greatfon implements IGetAll {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	private async scrapePosts(path: string): Promise<PostsResponse> {
		const html = await this.scraper.getHtml({ path });
		const $ = cheerio.load(html);
		const posts: Post[] = [];

		$(".content__img-wrap").each((_i, el) => {
			const mediaId = reverseString(
				$(el).find("a").attr("href")?.replace("/c/", "") as string,
			);
			const description = $(el).find(".content__text").text();

			posts.push({
				id: mediaId,
				shortcode: mediaIdToShortcode(mediaId),
				description,
				thumb: proxyUrl($(el).find(".content__img").attr("src") as string),
				isVideo: $(el).find(".content__camera").length > 0,
			});
		});

		const cursor = String($("#load_more").attr("data-cursor"));
		const username = path.match(/\/([^\/?]+)(?=\/?(\?|$))/)?.at(1);
		await sleep(env.SLEEP_TIME_PER_REQUEST);
		const hasNextHtml = await this.scraper.getHtml({
			path: `api/profile/${username}/?cursor=${cursor}`,
		});
		const $$ = cheerio.load(hasNextHtml);
		const hasNext = $$(".grid-item").length > 0;

		return {
			posts,
			cursor: hasNext ? convertToBase64(cursor) : undefined,
			hasNext,
		};
	}

	async getProfile(username: string): Promise<Profile> {
		const html = await this.scraper.getHtml({ path: `v/${username}` });
		const $ = cheerio.load(html);

		const urlStr = $(".user__img").attr("style") as string;
		const startIdx = urlStr.indexOf("'") + 1;
		const endIdx = urlStr.lastIndexOf("'");
		const profilePictureUrl = urlStr.substring(startIdx, endIdx);

		const $username = $(".user__info").find("h4").text();
		const usr = $username.startsWith("@") ? $username.slice(1) : username;
		const $userTitle = $(".user__title");

		return {
			username: usr,
			profilePicture: proxyUrl(profilePictureUrl),
			isPrivate: $(".private-block-description").length > 0,
			fullname: $userTitle.is("h1")
				? $userTitle.text().trim()
				: $userTitle.find("h1").text().trim(),
			biography: stripHtmlTags(
				replaceBrWithNewline($(".user__info-desc").html()?.trim() as string),
			),
			...extractTagsAndUsers($(".user__info-desc").html()?.trim() as string),
			mediaCount: Number(
				$("li.user__item:nth-child(1)").length > 0
					? $("li.user__item:nth-child(1)").text().split("Posts")[0].split(" ").join("")
					: $("li.list__item:nth-child(1)").text().split("Posts")[0].split(" ").join(""),
			),
			followers: Number(
				$("li.user__item:nth-child(2)").length > 0
					? $("li.user__item:nth-child(2)")
							.text()
							.split("Followers")[0]
							.split(" ")
							.join("")
					: $("li.list__item:nth-child(2)")
							.text()
							.split("Followers")[0]
							.split(" ")
							.join(""),
			),
			following: Number(
				$("li.user__item:nth-child(3)").length > 0
					? $("li.user__item:nth-child(3)")
							.text()
							.split("Following")[0]
							.split(" ")
							.join("")
					: $("li.list__item:nth-child(3)")
							.text()
							.split("Following")[0]
							.split(" ")
							.join(""),
			),
		};
	}

	async getPosts({ username, cursor }: IgetPostsOptions): Promise<PostsResponse> {
		if (cursor) {
			return await this.scrapePosts(`api/profile/${username}/?cursor=${cursor}`);
		}

		return await this.scrapePosts(`v/${username}`);
	}

	async getPost(shortcode: string): Promise<Post> {
		const mediaId = shortcodeToMediaId(shortcode);
		const reversedId = reverseString(mediaId);
		const html = await this.scraper.getHtml({ path: `c/${reversedId}` });
		const $ = cheerio.load(html);
		const author = await this.getProfile(
			$(".main__user-info").find("a").text().replace("@", ""),
		);
		const createdAtText = $(".content__time-text").text() || $(".bx-time").next().text();
		const likes = $(".content__like-text").text() || $(".bx-like").next().text();
		const commentsCount =
			$(".content__comment-text").text() || $(".bx-comment-dots").next().text();

		const post: Post = {
			id: mediaId,
			shortcode,
			author: {
				username: author.username,
				avatar: author.profilePicture,
				name: author.fullname,
			},
			description: stripHtmlTags(replaceBrWithNewline($(".main__list").html() as string)),
			...extractTagsAndUsers($(".main__list").html() as string),
			created_at: {
				relative: convertTimestampToRelativeTime(convertTextToTimestamp(createdAtText)),
				timestamp: convertTextToTimestamp(createdAtText),
			},
			commentsCount: compactToNumber(commentsCount),
			likes: compactToNumber(likes),
			isVideo: $(".video-container>video").length > 0,
			isSideCard: $(".swiper-container").length > 0,
			thumb: proxyUrl($(".main__image-container").find("img").attr("src") as string),
			sidecard: [],
		};

		if (post.isVideo) {
			post.video = proxyUrl($(".video-container>video").attr("src") as string);
			post.thumb = proxyUrl($(".video-container>video").attr("poster") as string);
		}

		if (post.isSideCard) {
			$(".swiper-slide").each((_i, el) => {
				const imageUrl = $(el).find("img").attr("src");
				const type = imageUrl ? "image" : "video";
				post.sidecard?.push({
					type,
					url: proxyUrl(
						$(el)
							.find(type === "image" ? "img" : ".video-container>video")
							.attr("src") as string,
					),
				});
			});
		}

		return post;
	}

	async getComments(shortcode: string): Promise<Comment[]> {
		const mediaId = shortcodeToMediaId(shortcode);
		const reversedId = reverseString(mediaId);
		const html = await this.scraper.getHtml({ path: `c/${reversedId}` });
		const $ = cheerio.load(html);
		const comments: Comment[] = [];

		$(".infinite_scroll>.grid-item>.media-body").each((_i, el) => {
			comments.push({
				username: $(el).find("strong").text().replace("@", ""),
				comment: $(el).find(".text-muted").text().trim(),
			});
		});
		return comments;
	}

	async getTag({ tag }: IGetTagOptions): Promise<Tag> {
		const { posts, cursor } = await this.scrapePosts(`t/${tag}`);
		const RANDOM_INDEX = Math.floor(Math.random() * posts.length);

		return {
			tag: `#${tag}`,
			posts,
			image: posts[RANDOM_INDEX].thumb,
			cursor,
			hasNext: true,
		};
	}

	async search(query: string): Promise<ResultsQuery> {
		const html = await this.scraper.getHtml({ path: `search/?query=${query}` });
		const $ = cheerio.load(html);

		const accounts: {
			username: string;
			profilePicture: string;
		}[] = [];
		const hashtags: { tag: string }[] = [];

		$("#nav-profiles .search-item").each((_i, user) => {
			const $img = $(user).find("img");
			accounts.push({
				username: $img.attr("alt") as string,
				profilePicture: proxyUrl($img.attr("src") as string),
			});
		});

		$("#nav-tags a").each((_i, tag) => {
			hashtags.push({
				tag: $(tag).attr("href")?.split("/").at(-1) as string,
			});
		});
		return {
			accounts,
			hashtags,
		};
	}
}
