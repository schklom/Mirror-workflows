import connection from "./base.js";

const table = 'feeds';

export async function createFeed(data) {
	return connection(table).insert(data);
}

export async function updateFeed(data) {
	return connection(table).where({ uid: data.uid }).update(data);
}

export async function deleteFeed(id) {
	return connection(table).where({ uid: id }).del();
}

export async function getAllFeeds() {
	return connection(table).select('*');
}

export async function getNextFeedInQueue() {
	let d = new Date();
	let time = d.toJSON().substring(0, 19);
	let res = await connection(table)
		.whereBetween('errorcount', [0, 3])
		.where('nextcheck', '<', time)
		.orderBy('nextcheck', 'asc')
		.limit(1);
	return res[0];
}

export async function getById(id: number) {
	let res = await connection(table).where({ uid: id }).select('*');
	return res.length ? res[0] : null;
}
