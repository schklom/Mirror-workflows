import { Greatfon, ResultsQuery } from "./greatfon";
import { Request, Response, Route } from "playwright-core";
import UserAgent from "user-agents";
import { Imgsed } from "./imgsed";
import { PlaywrightScraper } from "./scrapers/playwright";
import { AxiosScraper } from "./scrapers/axios";
import { convertTTlToTimestamp } from "@/utils";
import { Wizstat } from "./wizstat";

export interface Profile {
	id?: number;
	username: string;
	fullname: string;
	profilePicture: string;
	isPrivate: boolean;
	biography: string;
	website?: string;
	tags: string[];
	users: string[];
	mediaCount: number;
	followers: number;
	following: number;
}

export interface Comment {
	username: string;
	avatar?: string;
	comment: string;
	created_at?: number;
}

export interface Post {
	id: string;
	shortcode: string;
	author?: Author;
	likes?: number;
	commentsCount?: number;
	description?: string;
	tags?: string[];
	users?: string[];
	thumb: string;
	video?: string;
	isVideo?: boolean;
	isSideCard?: boolean;
	sidecard?: { type: "image" | "video"; url: string }[];
	created_at?: {
		relative?: string;
		timestamp?: number;
	};
}

export interface Author {
	username: string;
	name?: string;
	avatar?: string;
}

export interface Tag {
	tag: string;
	image: string;
	posts: Post[];
	hasNext: boolean | undefined;
	cursor: string | undefined;
}

export interface PostsResponse {
	posts: Post[];
	hasNext?: boolean;
	cursor?: string;
}

export interface TagResponse {
	tag: string;
	image: string;
	posts: Post[];
	hasNext?: boolean;
	cursor?: string;
}

export interface IGetProfile {
	getProfile(username: string): Promise<Profile>;
}
export interface IGetComments {
	getComments(shortcode: string): Promise<Comment[]>;
}

export interface IgetPostsOptions {
	cursor?: string;
	username: string;
}

export interface IGetPosts {
	getPosts({ cursor, username }: IgetPostsOptions): Promise<PostsResponse>;
}
export interface IGetPost {
	getPost(shortcode: string): Promise<Post>;
}

export interface IGetSearch {
	search(query: string): Promise<ResultsQuery>;
}

export const randomUserAgent = new UserAgent().toString();

export interface IGetHtmlOptions {
	path: string;
	expireTime: number;
}

export interface IGetTagOptions {
	cursor?: string;
	tag: string;
}

export interface IGetTag {
	getTag(options: IGetTagOptions): Promise<Tag>;
}

export interface IGetHtml {
	getHtml(options: IGetHtmlOptions): Promise<string>;
}

export interface IGetJson {
	getJson<T>(options: IGetHtmlOptions): Promise<T>;
}

export interface IGetRequestResponseOptions {
	match: string | RegExp | ((response: Response) => boolean | Promise<boolean>);
	path: string;
	expireTime: number;
}

export interface IGetRequestResponse {
	getRequestResponse<T>(
		options: IGetRequestResponseOptions,
		callback?: (route: Route, request: Request) => unknown,
	): Promise<T>;
}

export interface IGetAll extends IGetProfile, IGetPost, IGetPosts, IGetTag {}

export type ProviderCanGet =
	| "Profile"
	| "Posts"
	| "Post"
	| "Tags"
	| "Search"
	| "Comments"
	| "load_more";

export interface Provider {
	url: string;
	headlessBrowser: boolean;
	provider: string;
	canget: ProviderCanGet;
	ttl: {
		posts: string;
		post: string;
		search?: undefined;
	};
}

export function getInstanceProviders(providers: Provider[]) {
	try {
		const providersInstances: (Greatfon | Wizstat | Imgsed)[] = [];

		providers.forEach((currentProvider) => {
			const keys = Object.keys(currentProvider.ttl);
			const values = Object.values(currentProvider.ttl);
			const scraperConfig = {
				baseURL: currentProvider.url,
				ttl: {
					...Object.fromEntries(
						keys.map((_, i) => [keys[i], convertTTlToTimestamp(values[i])]),
					),
				},
			};

			switch (currentProvider.provider) {
				case "Greatfon":
					providersInstances.push(
						new Greatfon(
							currentProvider.headlessBrowser
								? new PlaywrightScraper(scraperConfig)
								: new AxiosScraper(scraperConfig),
						),
					);
					break;
				case "Wizstat":
					providersInstances.push(
						new Wizstat(
							currentProvider.headlessBrowser
								? new PlaywrightScraper(scraperConfig)
								: new AxiosScraper(scraperConfig),
						),
					);
					break;
				case "Imgsed":
					providersInstances.push(
						new Imgsed(
							currentProvider.headlessBrowser
								? new PlaywrightScraper(scraperConfig)
								: new AxiosScraper(scraperConfig),
						),
					);
					break;
			}
		});

		return providersInstances;
	} catch (error) {
		throw new Error("Could not get the instances");
	}
}
