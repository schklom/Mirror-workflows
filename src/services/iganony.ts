import * as cheerio from "cheerio";
import { env } from "env.mjs";
import { sleep } from "@/utils";
import { proxyUrl } from "@/utils/url";
import { AxiosScraper } from "./scrapers/axios";
import { Post, PostsResponse, Profile } from "./types";
import { convertTimestampToRelativeTime } from "@/utils/converters/time";
import { convertToBase64, extractTagsAndUsers } from "@/utils/text";
import { mediaIdToShortcode, shortcodeToMediaId } from "@/utils/id";
import { IGetPosts, IGetProfile, IgetPostsOptions } from "./types/functions";

interface IganonyResponse {
	status: number;
	profile: IganonyProfile;
	profilePosts: IganonyProfilePosts;
}

interface IganonyProfile {
	biography: string;
	category_name: string;
	edge_follow: EdgeFollow;
	edge_followed_by: EdgeFollow;
	post_count: number;
	full_name: string;
	pk: string;
	is_private: boolean;
	is_verified: boolean;
	profile_pic_url: string;
	profile_pic_url_hd: string;
	highlight_reel_count: number;
	username: string;
	// reel_captions: any[];
	tagged_users: TaggedUser[];
	storySessionID: string;
}

interface EdgeFollow {
	count: number;
}

interface TaggedUser {
	username: string;
	profile_pic_url: string;
}

interface IganonyProfilePosts {
	after: string;
	data: IganonyPost[];
}

interface IganonyMorePosts {
	status: 0 | 1;
	after: string;
	data: {
		id: string;
		taken_at: number;
		caption_text: string;
		image_url: string;
	}[];
}

interface IganonyPost {
	id: string;
	shortcode: string;
	image_url: string;
	caption_text: string;
	comment_count: number;
	like_count: number;
	taken_at: number;
	username_owner: string;
}

export class Iganony implements IGetProfile, IGetPosts {
	constructor(private scraper: AxiosScraper) {}

	private async fetchProfileAndPosts(username: string) {
		const html = await this.scraper.getHtml({ path: `/profile/${username}` });
		const $ = cheerio.load(html);
		const nextData = $("script#__NEXT_DATA__").text();
		const profileSessionID = JSON.parse(nextData).props.pageProps.profileInfo.profileSessionID;

		await sleep(env.SLEEP_TIME_PER_REQUEST);
		return await this.scraper.getJson<IganonyResponse>({
			path: `/api/profile/${username}`,
			data: {
				token: "",
				profileSessionID,
			},
		});
	}

	private async fetchMorePosts({ userId, cursor }: { userId: number; cursor: string }) {
		const { data, after } = await this.scraper.getJson<IganonyMorePosts>({
			path: `/api/posts/${userId}?after=${cursor}`,
		});
		const posts: Post[] = data.map((post) => ({
			id: post.id,
			shortcode: mediaIdToShortcode(post.id),
			description: post.caption_text,
			thumb: proxyUrl(post.image_url),
			created_at: {
				relative: convertTimestampToRelativeTime(post.taken_at),
				timestamp: post.taken_at,
			},
		}));

		return {
			posts,
			cursor: convertToBase64(after),
			hasNext: after ? true : false,
		};
	}

	async getProfile(username: string): Promise<Profile> {
		const { profile } = await this.fetchProfileAndPosts(username);

		return {
			id: Number(profile.pk),
			username: profile.username,
			profilePicture: proxyUrl(profile.profile_pic_url_hd),
			isPrivate: profile.is_private,
			fullname: profile.full_name,
			biography: profile.biography,
			...extractTagsAndUsers(profile.biography),
			mediaCount: profile.post_count,
			following: profile.edge_follow.count,
			followers: profile.edge_followed_by.count,
		};
	}

	async getPosts({ username, cursor }: IgetPostsOptions): Promise<PostsResponse> {
		const { profile, profilePosts } = await this.fetchProfileAndPosts(username);

		if (cursor) {
			return await this.fetchMorePosts({
				userId: Number(profile.pk),
				cursor,
			});
		}

		const posts: Post[] = profilePosts.data.map((post) => ({
			id: shortcodeToMediaId(post.shortcode),
			shortcode: post.shortcode,
			author: {
				username: post.username_owner,
				name: profile.full_name,
				avatar: proxyUrl(profile.profile_pic_url_hd),
			},
			likes: post.like_count,
			commentsCount: post.comment_count,
			description: post.caption_text,
			thumb: proxyUrl(post.image_url),
			created_at: {
				relative: convertTimestampToRelativeTime(post.taken_at),
				timestamp: post.taken_at,
			},
		}));

		return {
			posts,
			cursor: convertToBase64(profilePosts.after),
			hasNext: profilePosts.after ? true : false,
		};
	}
}
