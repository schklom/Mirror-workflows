import connection from "./base.js";

const table = 'feed_items';

export async function insertIfNotExists(data, feedId: number) {
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

export async function getItemsForFeed(feedId: number, max: number) {
	return connection(table)
		.where('feed', feedId)
		.orderBy('added', 'desc')
		.limit(max);
}
