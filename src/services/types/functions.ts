import { ResultsQuery } from "@/services/greatfon";
import { Comment, Post, PostsResponse, Profile, Story, Tag } from ".";

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

export interface IGetStories {
	getStories(username: string): Promise<Story[]>;
}

export interface IGetSearch {
	search(query: string): Promise<ResultsQuery>;
}

export interface IGetHtmlOptions {
	path: string;
	data?: unknown;
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

export interface IGetAll extends IGetProfile, IGetPost, IGetPosts, IGetTag {}
