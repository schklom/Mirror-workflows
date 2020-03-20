const knex = require('knex');

const connection = knex({
	client: 'pg',
	connection: process.env.DATABASE_URL
})

module.exports = connection;
