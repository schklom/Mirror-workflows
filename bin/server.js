import env from 'dotenv';
env.config({
    path: '.env.local'
});
env.config({
    path: '.env'
});
import createApp from '../dist/server.js';
import connection from '../dist/repository/base.js';
import { runMigrations, waitForDatabase } from '../dist/repository/util.js';
import * as CronService from '../dist/service/cron.js';
import * as CleanService from '../dist/service/cleanup.js';
Error.stackTraceLimit = 999;

async function run() {
    console.log(process.env.DATABASE_URL);
    const dbUri = new URL(process.env.DATABASE_URL || '');
    console.log('waiting for db...');
    await waitForDatabase(dbUri);
    console.log('executing migrations...');
    await runMigrations(dbUri);
    console.log('starting server with env', process.env);
	const app = createApp();
	app.listen(3000);
	await connection.raw('select 1')
	console.log('db connection aquired');
	CronService.start()
	CleanService.start();
}

run()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });

process.on('SIGTERM', () => {
	app.close();
	CronService.stop();
	CleanService.stop();
});


