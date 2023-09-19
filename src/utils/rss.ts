import { Post, PostsResponse, Profile, Story } from "@/services/types";
import { axiosInstance, sleep } from "@/utils";
import { Feed } from "feed";
import { getBaseUrl } from "./url";

let feed: Feed;

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

export class RSS {
	private async createFeed({
		username,
		path,
		titleSufix,
	}: { username: string; path: string; titleSufix?: string }) {
		const { data: profile } = await axiosInstance.get<Profile>(username);
		feed = new Feed({
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
		const [, { data }] = await Promise.all([
			this.createFeed({ username, path: username }),
			axiosInstance.get<PostsResponse>(`${username}/posts`),
		]);
		const posts = data.posts;

		const maximumPosts =
			process.env.ITEMS_PER_RSS > 12 ? 12 : process.env.ITEMS_PER_RSS;

		for (let i = 0; i < maximumPosts; i++) {
			const p = posts[i];
			await sleep(process.env.SLEEP_TIME_PER_REQUEST);
			const { data: post } = await axiosInstance.get<Post>(`p/${p.shortcode}`);

			const type = `${
				post.isSideCard ? "Sidecard" : post.isVideo ? "Video" : "Photo"
			}`;
			const truncatedDescription = post.description
				? post.description.length > 30
					? `${post.description.slice(0, 30)}...`
					: post.description
				: null;

			feed.addItem({
				title: truncatedDescription
					? `${type}: ${truncatedDescription}`
					: `${type}`,
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
						name: post.author?.name,
						link: `${getBaseUrl()}/${post.author?.username}`,
					},
				],
				date: post.created_at?.timestamp
					? new Date(post.created_at?.timestamp * 1000)
					: new Date(Date.now()),
				image: post.thumb,
			});
		}

		return feed.atom1();
	}

	async getStories(username: string) {
		const [, { data: stories }] = await Promise.all([
			this.createFeed({
				username,
				path: `${username}/stories`,
				titleSufix: "- Stories",
			}),
			axiosInstance.get<Story[]>(`${username}/stories`),
		]);

		stories.forEach((story, i) => {
			feed.addItem({
				title: story.isVideo ? "Video" : "Image",
				id: `${username}-story-${i + 1}`,
				link: `${getBaseUrl()}/${username}/stories#${username}-story-${i + 1}`,
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

		return feed.atom1();
	}
}
