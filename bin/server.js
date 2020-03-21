const env = require('dotenv');
env.config({ path: '.env.local' });
env.config({ path: '.env' });
const port = process.env.APP_PORT || 3000;
const { runMigrations, waitForDatabase } = require('../src/server/db');

async function run() {
	const dbUri = new URL(process.env.DATABASE_URL || '');
	await waitForDatabase(dbUri);
	await runMigrations(dbUri);
	const App = require("../src/server/server");
	App.listen(port);
	const Cron = require('../src/fetcher/cron');
	Cron.start();
}

run()
	.catch(e => {
		console.error(e);
		process.exit(1);
	});
