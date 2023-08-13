import { Post, PostsResponse, Profile } from "@/services";
import { axiosInstance, getBaseUrl, sleep } from "@/utils";
import { Feed } from "feed";

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
	private async createFeed(username: string) {
		const { data: profile } = await axiosInstance.get<Profile>(username);
		feed = new Feed({
			id: profile.username,
			title: `${profile.fullname} (@${profile.username}) • Proxigram`,
			copyright: "All rights to its authors",
			description: profile.biography,
			link: `${getBaseUrl()}/${profile.username}`,
			image: profile.profilePicture,
			author: {
				name: profile.fullname,
				link: `${getBaseUrl()}/${profile.username}`,
			},
			feed: `${getBaseUrl()}/${profile.username}/rss`,
		});
	}

	async getPostsRss(username: string) {
		const [, { data }] = await Promise.all([
			this.createFeed(username),
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
}
