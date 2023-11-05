import { Profile, Story } from "./types";
import { IGetProfile, IGetStories } from "./types/functions";
import { AxiosScraper } from "./scrapers/axios";
import { PlaywrightScraper } from "./scrapers/playwright";
import { StoriesIGProfile, StoriesIGStories } from "./types/storiesig";
import { extractTagsAndUsers } from "@/utils/text";
import { proxyUrl } from "@/utils/url";
import { convertTimestampToRelativeTime } from "@/utils/converters/time";
import { fetchJSON } from "@/utils/fetch";

export class StoriesIG implements IGetProfile, IGetStories {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	async getProfile(username: string): Promise<Profile> {
		const json = await fetchJSON<StoriesIGProfile>({
			path: `api/ig/userInfoByUsername/${username}`,
			scraper: this.scraper,
		});
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
		const path = `api/ig/story?url=${encodeURIComponent(
			`https://instagram.com/stories/${username}`,
		)}`;
		const json = await fetchJSON<StoriesIGStories>({
			path,
			scraper: this.scraper,
		});

		return json.result.map((story) => ({
			id: story.pk,
			thumb: proxyUrl(story.image_versions2.candidates[0].url),
			isVideo: story.video_versions ? true : false,
			video: story.video_versions ? proxyUrl(story.video_versions[0].url) : undefined,
			created_at: {
				relative: convertTimestampToRelativeTime(story.taken_at),
				timestamp: story.taken_at,
			},
		}));
	}
}
