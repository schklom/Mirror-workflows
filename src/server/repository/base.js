const knex = require('knex');

const connection = knex({
	client: 'pg',
	connection: process.env.DATABASE_URL,
	pool: {
		min: 0,
		max: 100,
		log: (message, logLevel) => console.log(`${logLevel}: ${message}`)
	}
})

module.exports = connection;
