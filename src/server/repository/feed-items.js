const connection = require('./base');

const table = 'feed_items';

async function insertIfNotExists(data, feedId) {
	let exists = await connection(table)
		.where({
			feed: feedId,
			link: data.link
		}).count();
	if (exists[0].count > 0) return;
	await connection(table)
		.insert({
			feed: feedId,
			link: data.link,
			title: data.title,
			description: data.description,
			added: data.added
		});
}

async function getItemsForFeed(feedId, max) {
	return connection(table)
		.where('feed', feedId)
		.orderBy('added', 'desc')
		.limit(max);
}



module.exports = {
	insertIfNotExists,
	getItemsForFeed
}
