import { FeedModel as Feed } from '../util/types.js'
import connection from "./base.js";

const table = 'feeds';

export async function createFeed(data: Partial<Feed>) {
	return connection(table).insert(data);
}

export async function updateFeed(data: Feed) {
	return connection(table).where({ uid: data.uid }).update(data);
}

export async function deleteFeed(id: number) {
	return connection(table).where({ uid: id }).del();
}

export async function getAllFeeds(): Promise<Feed[]> {
	return connection(table).select('*');
}

export async function getNextFeedInQueue(): Promise<Feed> {
	let d = new Date();
	let time = d.toJSON().substring(0, 19);
	let res = await connection(table)
		.whereBetween('errorcount', [0, 3])
		.where('nextcheck', '<', time)
		.orderBy('nextcheck', 'asc')
		.limit(1);
	return res[0];
}

export async function getById(id: number): Promise<Feed | null> {
	let res = await connection(table).where({ uid: id }).select('*');
	return res.length ? res[0] : null;
}

export async function findByLastRetrievalBefore(date: Date): Promise<Feed[]> {
	let res = await connection(table).where('lastretrieval', '<', date).select();
	return res;
}

export async function findByCreatedBefore(date: Date): Promise<Feed[]> {
	let res = await connection(table).where('created', '<', date).select();
	return res;
}

export async function updateLastRetrieval(uid: number) {
	await connection(table).where({ uid }).update({ lastretrieval: new Date() });
}
