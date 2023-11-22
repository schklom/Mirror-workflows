import * as FeedRepo from '../repository/feed.js';
import * as FeedItemRepo from '../repository/feed-items.js';
import { generateFeedFromSettings } from './feed.js';
import Debug from 'debug';
import { FeedModel as Feed } from '../util/types.js'
const debug = Debug('ap:cron');

const baseInterval = (parseInt(process.env.CRON_BASE) || 50) * 1000;
const rngInterval = (parseInt(process.env.CRON_RNG) || 20) * 1000;

let timer, running = false;

async function run() {
	timer = setTimeout(run, ~~(baseInterval + Math.random()*rngInterval));
	if (running) return;
	running = true;
	try {
		await fetchNextFeed();
	} catch (e) {
		console.error('unexpected error during cron', e);
	}
	running = false;
}

export function start() {
	if (timer || running) return;
	debug('started cron');
	run();
}
export function stop() {
	if (!timer) return;
	clearTimeout(timer);
	timer = null;
	debug('stopped cron');
}

let backoffIntervals = [
	60,
	60 * 6,
	60 * 30
];
const maxErrorCount = 3;

export async function fetchNextFeed() {
	let feedSettings = await FeedRepo.getNextFeedInQueue();
	if (!feedSettings) return;
	debug('cron check', feedSettings);
	feedSettings.lastcheck = new Date();
	try {
		let feed = await generateFeedFromSettings(feedSettings);
		if (feed.items.length === 0 && feedSettings.noitemsiserror) {
			throw new Error('found no content in page');
		}
		for (let item of feed.items) {
			await FeedItemRepo.insertIfNotExists(item as any, feedSettings.uid);
		}
		updateNextCheck(feedSettings, false);
		feedSettings.log.errors = [];
	} catch (e) {
		console.log(e);
		updateNextCheck(feedSettings, true);
		if (!feedSettings.log) feedSettings.log = { errors: [] };
		if (!Array.isArray(feedSettings.log.errors)) feedSettings.log.errors = [];
		feedSettings.log.errors.push({ message: e.message, stack: e.stack });
		if (feedSettings.errorcount > maxErrorCount) {
			feedSettings.nextcheck = null;
		}
		if (feedSettings.inserterrorsasitems) {
			let errorItem = createErrorItem(e, feedSettings);
			await FeedItemRepo.insertIfNotExists(errorItem, feedSettings.uid);
		}
	}
	await FeedRepo.updateFeed(feedSettings);
}

function createErrorItem(err: Error, feedSettings: Feed) {
	let link = feedSettings.url + '#error' + Date.now();
	return {
		id: link, //crypto.createHash('sha1').update(link).digest('hex'),
		title: 'Error when retrieving feed',
		link,
		description: err.message,
		date: new Date()
	};
}

function updateNextCheck(feedSettings: Feed, error: boolean) {
	let next = new Date();
	let errTime = Math.min(maxErrorCount, feedSettings.errorcount);
	let errorInterval = error ? backoffIntervals[errTime] : 0;
	next.setMinutes( next.getMinutes() + feedSettings.checkinterval + errorInterval );
	feedSettings.nextcheck = next;
	feedSettings.errorcount = error ? feedSettings.errorcount+1 : 0;
}
