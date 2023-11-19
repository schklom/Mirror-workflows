import connection from "./base.js";
import { FeedItem } from "../util/types.js";

const table = 'feed_items';

export async function insertIfNotExists(data: Partial<FeedItem>, feedId: number) {
	let exists = await connection(table)
		.where({
			feed: feedId,
			link: data.link
		}).count();
	let count = ~~exists[0].count;
	if (count > 0) return;
	await connection(table)
		.insert({
			feed: feedId,
			link: data.link,
			title: data.title,
			image: data.image,
			description: data.description,
			added: data.added
		});
}

export async function getItemsForFeed(feedId: number, max: number): Promise<FeedItem[]> {
	let data = await connection(table)
		.where('feed', feedId)
		.orderBy('added', 'desc')
		.limit(max)
		.select();
	return data;
}
