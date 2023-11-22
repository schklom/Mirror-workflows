import env from 'dotenv';
env.config({ path: '.env.local' });
env.config({ path: '.env' });
import { waitForDatabase } from '../dist/repository/util.js';
import * as CronService from '../dist/service/cron.js';

async function run() {
	const dbUri = new URL(process.env.DATABASE_URL || '');
	await waitForDatabase(dbUri);
	await CronService.fetchNextFeed();
	process.emit('SIGTERM');
}

run()
	.catch(e => {
		console.error(e);
		process.exit(1);
	});
