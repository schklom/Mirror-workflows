const env = require('dotenv');
env.config({ path: '.env.local' });
env.config({ path: '.env' });
const { waitForDatabase } = require('../src/server/db');

async function run() {
	const dbUri = new URL(process.env.DATABASE_URL || '');
	await waitForDatabase(dbUri);
	const Cron = require('../src/fetcher/cron');
	await Cron.fetchNextFeed();
}

run()
	.catch(e => {
		console.error(e);
		process.exit(1);
	});
