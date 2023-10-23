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

export interface Story {
	id: string;
	thumb: string;
	video?: string;
	isVideo?: boolean;
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
	hasNext: boolean;
	cursor?: string;
}

export interface TagResponse {
	tag: string;
	image: string;
	posts: Post[];
	hasNext?: boolean;
	cursor?: string;
}

export interface ErrorResponse {
	statusCode: number;
	message: string;
}
