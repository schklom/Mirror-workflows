const FeedRepo = require('../server/repository/feed');
const FeedItemRepo = require('../server/repository/feed-items');
const { generateFeedFromSettings } = require('./feed');
const debug = require('debug')('ap:cron');

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

function start() {
	if (timer || running) return;
	debug('started cron');
	run();
}
function stop() {
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

async function fetchNextFeed() {
	let feedSettings = await FeedRepo.getNextFeedInQueue();
	if (!feedSettings) return;
	debug('cron check', feedSettings);
	feedSettings.lastcheck = new Date();
	try {
		let feed = await generateFeedFromSettings(feedSettings);
		for (let item of feed.items) {
			await FeedItemRepo.insertIfNotExists(item, feedSettings.uid);
		}
		updateNextCheck(feedSettings, false);
		feedSettings.log.errors = [];
	} catch (e) {
		console.log(e);
		updateNextCheck(feedSettings, true);
		if (!feedSettings.log) feedSettings.log = {};
		if (!Array.isArray(feedSettings.log.errors)) feedSettings.log.errors = [];
		feedSettings.log.errors.push({ message: e.message, stack: e.stack });
		if (feedSettings.errorcount > maxErrorCount) {
			feedSettings.nextcheck = null;
		}
	}
	await FeedRepo.updateFeed(feedSettings);
}

function updateNextCheck(feedSettings, error) {
	let next = new Date();
	let errTime = Math.min(maxErrorCount, feedSettings.errorcount);
	let errorInterval = error ? backoffIntervals[errTime] : 0;
	next.setMinutes( next.getMinutes() + feedSettings.checkinterval + errorInterval );
	feedSettings.nextcheck = next;
	feedSettings.errorcount = error ? feedSettings.errorcount+1 : 0;
}

module.exports = {
	start,
	stop
}
