const connection = require('./base');

const table = 'feeds';

async function createFeed(data) {
	return connection(table).insert(data);
}

async function updateFeed(data) {
	return connection(table).where({ uid: data.uid }).update(data);
}

async function deleteFeed(id) {
	return connection(table).where({ uid: id }).del();
}

async function getAllFeeds() {
	return connection(table).select('*');
}

async function getNextFeedInQueue() {
	let d = new Date();
	let time = d.toJSON().substr(0, 19);
	let res = await connection(table)
		.whereBetween('errorcount', [0, 3])
		.where('nextcheck', '<', time)
		.orderBy('nextcheck', 'asc')
		.limit(1);
	return res[0];
}

async function getById(id) {
	let res = await connection(table).where({ uid: id }).select('*');
	return res.length ? res[0] : null;
}


module.exports = {
	createFeed,
	updateFeed,
	deleteFeed,
	getAllFeeds,
	getNextFeedInQueue,
	getById
}
