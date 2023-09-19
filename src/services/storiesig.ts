import * as cheerio from "cheerio";
import { Profile, Story } from "./types";
import { IGetProfile, IGetStories } from "./types/functions";
import { AxiosScraper } from "./scrapers/axios";
import { PlaywrightScraper } from "./scrapers/playwright";
import { StoriesIGProfile, StoriesIGStories } from "./types/storiesig";
import { extractTagsAndUsers } from "@/utils/text";
import { proxyUrl } from "@/utils/url";
import { convertTimestampToRelativeTime } from "@/utils/converters/time";

export class StoriesIG implements IGetProfile, IGetStories {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	async getProfile(username: string): Promise<Profile> {
		let json: StoriesIGProfile;
		const path = `api/ig/userInfoByUsername/${username}`;

		if (this.scraper instanceof AxiosScraper) {
			json = await this.scraper.getJson<StoriesIGProfile>({
				path,
				expireTime: this.scraper.config.ttl?.posts as number,
			});
		} else {
			const html = await this.scraper.getHtml({
				path,
				expireTime: this.scraper.config.ttl?.post as number,
			});
			const $ = cheerio.load(html);
			json = JSON.parse($("pre").text());
		}

		const profile = json.result.user;

		return {
			id: Number(profile.pk),
			username: profile.username,
			fullname: profile.full_name,
			biography: profile.biography,
			...extractTagsAndUsers(profile.biography),
			followers: profile.follower_count,
			following: profile.following_count,
			mediaCount: profile.media_count,
			isPrivate: profile.is_private,
			profilePicture: proxyUrl(profile.profile_pic_url),
			website: profile.external_url,
		};
	}

	async getStories(username: string): Promise<Story[]> {
		let json: StoriesIGStories;
		const path = `api/ig/story?url=${encodeURIComponent(
			`https://instagram.com/stories/${username}`,
		)}`;

		if (this.scraper instanceof AxiosScraper) {
			json = await this.scraper.getJson<StoriesIGStories>({
				path,
				expireTime: this.scraper.config.ttl?.posts as number,
			});
		} else {
			const html = await this.scraper.getHtml({
				path,
				expireTime: this.scraper.config.ttl?.post as number,
			});
			const $ = cheerio.load(html);
			json = JSON.parse($("pre").text());
		}

		return json.result.map((story) => ({
			thumb: proxyUrl(story.image_versions2.candidates[0].url),
			isVideo: story.video_versions ? true : false,
			video: story.video_versions
				? proxyUrl(story.video_versions[0].url)
				: undefined,
			created_at: {
				relative: convertTimestampToRelativeTime(story.taken_at),
				timestamp: story.taken_at,
			},
		}));
	}
}
