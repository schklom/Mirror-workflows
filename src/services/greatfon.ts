import {
	Comment,
	IGetAll,
	IGetTagOptions,
	IgetPostsOptions,
	Post,
	Profile,
	Tag,
	PostsResponse,
} from ".";
import { AxiosScraper } from "./scrapers/axios";
import {
	compactToNumber,
	convertTextToTimestamp,
	convertTimestampToRelativeTime,
	extractTagsAndUsers,
	mediaIdToShortcode,
	proxyUrl,
	replaceBrWithNewline,
	reverseString,
	shortcodeToMediaId,
	stripHtmlTags,
} from "@/utils";
import * as cheerio from "cheerio";
import { PlaywrightScraper } from "./scrapers/playwright";

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
		const html = await this.scraper.getHtml({
			path,
			expireTime: this.scraper.config.ttl?.posts as number,
		});
		const $ = cheerio.load(html);
		const posts: Post[] = [];

		$(".content__img-wrap").each((_i, el) => {
			const mediaId = reverseString(
				$(el).find("a").attr("href")?.replace("/c/", "") as string,
			);

			posts.push({
				id: mediaId,
				shortcode: mediaIdToShortcode(mediaId),
				description: $(el).find(".content__text").text(),
				thumb: proxyUrl($(el).find(".content__img").attr("src") as string),
				isVideo: $(el).find(".content__camera").length > 0,
			});
		});

		return {
			posts,
		};
	}

	async getProfile(username: string): Promise<Profile> {
		const html = await this.scraper.getHtml({
			path: `v/${username}`,
			expireTime: this.scraper.config.ttl?.posts as number,
		});
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
					? $("li.user__item:nth-child(1)")
							.text()
							.split("Posts")[0]
							.split(" ")
							.join("")
					: $("li.list__item:nth-child(1)")
							.text()
							.split("Posts")[0]
							.split(" ")
							.join(""),
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

	async getPosts({ username }: IgetPostsOptions): Promise<PostsResponse> {
		return await this.scrapePosts(`v/${username}`);
	}

	async getPost(shortcode: string): Promise<Post> {
		const mediaId = shortcodeToMediaId(shortcode);
		const reversedId = reverseString(mediaId);
		const html = await this.scraper.getHtml({
			path: `c/${reversedId}`,
			expireTime: this.scraper.config.ttl?.post as number,
		});
		const $ = cheerio.load(html);
		const author = await this.getProfile(
			$(".main__user-info").find("a").text().replace("@", ""),
		);
		const createdAtText =
			$(".content__time-text").text() || $(".bx-time").next().text();
		const likes =
			$(".content__like-text").text() || $(".bx-like").next().text();
		const commentsCount =
			$(".content__comment-text").text() || $("bx-comment-dots").next().text();

		const post: Post = {
			id: mediaId,
			shortcode,
			author: {
				username: author.username,
				avatar: author.profilePicture,
				name: author.fullname,
			},
			description: stripHtmlTags(
				replaceBrWithNewline($(".main__list").html() as string),
			),
			...extractTagsAndUsers($(".main__list").html() as string),
			created_at: {
				relative: convertTimestampToRelativeTime(
					convertTextToTimestamp(createdAtText),
				),
				timestamp: convertTextToTimestamp(createdAtText),
			},
			commentsCount: compactToNumber(commentsCount),
			likes: compactToNumber(likes),
			isVideo: $(".video-container>video").length > 0,
			isSideCard: $(".swiper-container").length > 0,
			thumb: proxyUrl(
				$(".main__image-container").find("img").attr("src") as string,
			),
			sidecard: [],
		};

		if (post.isVideo) {
			post.video = proxyUrl($(".video-container>video").attr("src") as string);
			post.thumb = proxyUrl(
				$(".video-container>video").attr("poster") as string,
			);
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
		const html = await this.scraper.getHtml({
			path: `c/${reversedId}`,
			expireTime: this.scraper.config.ttl?.post as number,
		});
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
		const html = await this.scraper.getHtml({
			path: `search/?query=${query}`,
			expireTime: this.scraper.config.ttl?.search as number,
		});
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
