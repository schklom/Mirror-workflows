import * as FeedRepo from '../repository/feed.js';
import Debug from 'debug';

const debug = Debug('ap:cleanup');

const InactiveInterval = process.env.DELETE_FEEDS_INACTIVE_HOURS ? parseInt(process.env.DELETE_FEEDS_INACTIVE_HOURS) : 0;
const ActiveInterval = process.env.DELETE_FEEDS_INACTIVE_RNG_HOURS ? parseInt(process.env.DELETE_FEEDS_INACTIVE_RNG_HOURS) : 0;
const ActiveCleanup = InactiveInterval > 0 || ActiveInterval > 0;

let timer: NodeJS.Timeout;
process.on('SIGHUP', () => {
	clearInterval(timer);
});

export async function start() {
	if (timer || !ActiveCleanup) return;
	timer = setInterval(runCleanup, 1000 * 60 * 60);
}

export async function stop() {
	if (!timer) return;
	clearInterval(timer);
	timer = null;
}

export async function runCleanup() {
	if (InactiveInterval) {
		let start = new Date();
		start.setHours(start.getHours() - InactiveInterval);
		let toDelete = await FeedRepo.findByLastRetrievalBefore(start);
		for (let feed of toDelete) {
			await FeedRepo.deleteFeed(feed.uid);
		}
		debug('deleted inactive feeds', toDelete.length);
	}
	if (ActiveInterval) {
		let start = new Date();
		start.setHours(start.getHours() - ActiveInterval);
		let toDelete = await FeedRepo.findByCreatedBefore(start);
		for (let feed of toDelete) {
			await FeedRepo.deleteFeed(feed.uid);
		}
		debug('deleted old feeds', toDelete.length);
	}
}
