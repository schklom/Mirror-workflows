import * as cheerio from "cheerio";
import { convertToInstagramUrl, proxyUrl } from "@/utils/url";
import { AxiosScraper } from "./scrapers/axios";
import { Profile } from "./types";
import { IGetProfile } from "./types/functions";
import { extractTagsAndUsers } from "@/utils/text";
import { PlaywrightScraper } from "./scrapers/playwright";

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
		let profile: InstaStoriesProfile;
		const pathCash = `api/profile/cash?username=${username}`;
		const path = `api/profile/v3/info?username=${username}`;

		if (this.scraper instanceof AxiosScraper) {
			await this.scraper.getJson<InstaStoriesRes>({ path: pathCash });
			profile = await this.scraper.getJson<InstaStoriesProfile>({ path });
		} else {
			await this.scraper.getHtml({ path: pathCash });
			const html = await this.scraper.getHtml({ path });
			const $ = cheerio.load(html);
			profile = JSON.parse($("pre").text());
		}

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
