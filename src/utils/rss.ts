import redis from "./redis";
import { env } from "../../env.mjs";
import { Feed } from "feed";
import { getBaseUrl } from "./url";
import { axiosInstance } from "@/utils";
import { convertTTlToTimestamp } from "./converters/time";
import { Post, PostsResponse, Profile, Story } from "@/services/types";

const renderContent = (post: Post): string => {
	let html = "";

	if (post.isVideo) {
		html += `<video src="${post.video}" poster="${post.thumb}" controls>
					<source src="${post.video}" type="video/mp4" />
				</video>`;
	}

	if (post.isSideCard && post.sidecard) {
		html += post.sidecard
			.map((media) =>
				media.type === "image"
					? `<img src="${media.url}" />`
					: `<video src="${media.url}" controls>
							<source src="${media.url}" type="video/mp4" />
						</video>`,
			)
			.join(" ");
	}

	if (!post.isVideo && !post.isSideCard) {
		html += `<img src="${post.thumb}" />`;
	}

	return html;
};

const expireTime = convertTTlToTimestamp(env.EXPIRE_TIME_FOR_RSS);

export class RSS {
	private async createFeed({
		username,
		path,
		titleSufix,
	}: {
		username: string;
		path: string;
		titleSufix?: string;
	}) {
		const { data: profile } = await axiosInstance.get<Profile>(username);
		return new Feed({
			id: profile.username,
			title: `${profile.fullname} (@${profile.username}) ${
				titleSufix ? titleSufix : ""
			} • Proxigram`,
			copyright: "All rights to its authors",
			description: profile.biography,
			link: `${getBaseUrl()}/${path}`,
			image: profile.profilePicture,
			author: {
				name: profile.fullname,
				link: `${getBaseUrl()}/${profile.username}`,
			},
			feed: `${getBaseUrl()}/${path}/rss`,
		});
	}

	async getPosts(username: string) {
		const cachedFeed = await redis.get(`feed:${username}`);
		if (cachedFeed) {
			return cachedFeed;
		}

		const [feed, { data }] = await Promise.all([
			this.createFeed({ username, path: username }),
			axiosInstance.get<PostsResponse>(`${username}/posts`),
		]);
		const shorcodes = data.posts.slice(0, env.ITEMS_PER_RSS).map((p) => p.shortcode);
		const posts = await Promise.allSettled(
			shorcodes.map(
				async (shortcode) => (await axiosInstance.get<Post>(`p/${shortcode}`)).data,
			),
		);

		posts.forEach((p) => {
			if (p.status === "fulfilled") {
				const post = p.value;
				const type = `${post.isSideCard ? "Sidecard" : post.isVideo ? "Video" : "Photo"}`;
				const truncatedDescription = post.description
					? post.description.length > 30
						? `${post.description.slice(0, 30)}...`
						: post.description
					: null;
				feed.addItem({
					title: truncatedDescription ? `${type}: ${truncatedDescription}` : `${type}`,
					id: post.id,
					link: `${getBaseUrl()}/p/${post.shortcode}`,
					description: post.description,
					content: `
					<p>
						${post.description}
					</p>
					${renderContent(post)}
				`,
					author: [
						{
							name: post.author?.username,
							link: `${getBaseUrl()}/${post.author?.username}`,
						},
					],
					date: post.created_at?.timestamp
						? new Date(post.created_at?.timestamp * 1000)
						: new Date(Date.now()),
					image: post.thumb,
				});
			}
		});

		const feedString = feed.atom1();
		await redis.setex(`feed:${username}`, expireTime, feedString);
		return feedString;
	}

	async getStories(username: string) {
		const cachedFeed = await redis.get(`feed:${username}:stories`);
		if (cachedFeed) {
			return cachedFeed;
		}
		const [feed, { data: stories }] = await Promise.all([
			this.createFeed({
				username,
				path: `${username}/stories`,
				titleSufix: "- Stories",
			}),
			axiosInstance.get<Story[]>(`${username}/stories`),
		]);

		stories.forEach((story) => {
			feed.addItem({
				title: story.isVideo ? "Video" : "Image",
				id: story.id,
				link: `${getBaseUrl()}/${username}/stories#${story.id}`,
				content: `
				${
					story.isVideo
						? `
						<video src="${story.video}" poster="${story.thumb}" controls>
							<source src="${story.video}" type="video/mp4" />
						</video>
						`
						: `
						<img src="${story.thumb}" />
						`
				}`,
				author: [
					{
						name: username,
						link: `${getBaseUrl()}/${username}`,
					},
				],
				date: story.created_at?.timestamp
					? new Date(story.created_at.timestamp * 1000)
					: new Date(Date.now()),
				image: story.thumb,
			});
		});

		const feedString = feed.atom1();
		await redis.setex(`feed:${username}:stories`, expireTime, feedString);
		return feedString;
	}
}
