import { convertToInstagramUrl, proxyUrl } from "@/utils/url";
import { AxiosScraper } from "./scrapers/axios";
import { Story } from "./types";
import { IGetStories } from "./types/functions";
import { convertToBase64 } from "@/utils/text";
import { PlaywrightScraper } from "./scrapers/playwright";
import { convertTextToTimestamp } from "@/utils/converters/time";
import { fetchJSON } from "@/utils/fetch";

export interface Welcome {
	user_info: UserInfo;
	picture: string;
	stories: StoryIN[];
	highlights: Highlight[];
	message: null;
	ticket: number;
	queue: null;
}

interface Highlight {
	node: Node;
}

interface Node {
	id: string;
	cover_media: CoverMedia;
	title: string;
}

interface CoverMedia {
	thumbnail_src: string;
}

interface StoryIN {
	media_type: "video" | "image";
	source: string;
	thumbnail: string;
	taken_at: string;
	mentions: string[];
	link: string;
}

interface UserInfo {
	id: number;
	username: string;
	full_name: string;
	is_private: boolean;
	is_verified: boolean;
	profile_pic_url: string;
	posts: number;
	followers: number;
	following: number;
}

export class InstaNavigation implements IGetStories {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	async getStories(username: string): Promise<Story[]> {
		const username64 = convertToBase64(`-1::${username}::`);
		const path = `api/v1/stories/${username64}`;
		const response = await fetchJSON<Welcome>({ path, scraper: this.scraper });

		return response.stories.map((story) => {
			const source = proxyUrl(convertToInstagramUrl(story.source));
			const id = story.thumbnail
				? String(convertToInstagramUrl(story.thumbnail).split("_").at(2))
				: String(source.split("_").at(2));

			return {
				id,
				thumb: story.thumbnail ? proxyUrl(convertToInstagramUrl(story.thumbnail)) : source,
				isVideo: story.media_type === "video" ? true : false,
				video: story.media_type === "video" ? source : undefined,
				created_at: {
					relative: `${story.taken_at} ago`,
					timestamp: convertTextToTimestamp(`${story.taken_at} ago`),
				},
			};
		});
	}
}
