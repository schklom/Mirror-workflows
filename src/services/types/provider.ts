export type ProviderCanGet =
	| "Profile"
	| "Posts"
	| "Post"
	| "Tags"
	| "Search"
	| "Comments"
	| "load_more"
	| "Stories";

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
