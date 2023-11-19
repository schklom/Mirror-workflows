import env from 'dotenv';
env.config({
    path: '.env.local'
});
env.config({
    path: '.env'
});
import {
    runMigrations,
    waitForDatabase
} from '../dist/repository/util.js';

async function run() {
    console.log(process.env.DATABASE_URL);
    const dbUri = new URL(process.env.DATABASE_URL || '');
    console.log('waiting for db...');
    await waitForDatabase(dbUri);
    console.log('executing migrations...');
    await runMigrations(dbUri);
    console.log('done');
}

run()
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
