import knex from 'knex';
import env from 'dotenv';
env.config({
    path: '.env.local'
});
env.config({
    path: '.env'
});

const connection = knex({
	client: 'pg',
	connection: process.env.DATABASE_URL,
	pool: {
		min: 0,
		max: 100,
		log: (message, logLevel) => console.log(`${logLevel}: ${message}`)
	},
	log: {
		deprecate(message) {
			console.warn(message);
		},
		debug(message) {
			console.debug(message);
		},
		warn(message) {
			console.warn(message);
		},
		error(message) {
			console.error(message);
		}
	}
})

process.on('SIGTERM', () => {
	connection.destroy();
})

export default connection;

