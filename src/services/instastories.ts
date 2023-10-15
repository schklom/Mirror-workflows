import { convertToInstagramUrl, proxyUrl } from "@/utils/url";
import { AxiosScraper } from "./scrapers/axios";
import { Profile } from "./types";
import { IGetProfile } from "./types/functions";
import { extractTagsAndUsers } from "@/utils/text";
import { PlaywrightScraper } from "./scrapers/playwright";
import { fetchJSON } from "@/utils/fetch";

interface InstaStoriesRes {
	profileInfo: InstaStoriesProfile;
	isCrawler: boolean;
}

interface InstaStoriesProfile {
	id: number;
	username: string;
	avatar: string;
	isPrivate: boolean;
	name: string;
	bio: string;
	website: string;
	publication: number;
	subscriber: number;
	subscription: number;
}

export class InstaStories implements IGetProfile {
	constructor(private scraper: AxiosScraper | PlaywrightScraper) {}

	async getProfile(username: string): Promise<Profile> {
		const pathCash = `api/profile/cash?username=${username}`;
		const path = `api/profile/v3/info?username=${username}`;
		await fetchJSON<InstaStoriesRes>({ path: pathCash, scraper: this.scraper });
		const profile = await fetchJSON<InstaStoriesProfile>({
			path,
			scraper: this.scraper,
		});

		return {
			id: profile.id,
			username: profile.username,
			fullname: profile.name,
			biography: profile.bio,
			...extractTagsAndUsers(profile.bio),
			followers: profile.subscriber,
			following: profile.subscription,
			mediaCount: profile.publication,
			isPrivate: profile.isPrivate,
			profilePicture: proxyUrl(convertToInstagramUrl(profile.avatar)),
			website: profile.website,
		};
	}
}
