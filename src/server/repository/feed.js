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


module.exports = {
	createFeed,
	updateFeed,
	deleteFeed,
	getAllFeeds
}
