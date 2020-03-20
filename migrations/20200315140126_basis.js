
exports.up = async function(knex) {
	return Promise.all([
		knex.schema.createTable('feeds', t => {
			t.increments('uid').primary();
			t.string('url').notNullable();
			t.json('loadparams').notNullable();
			t.json('selectors').notNullable();
			t.datetime('created').notNullable().defaultTo('NOW()');
			t.datetime('lastcheck');
			t.datetime('lastsuccess');
			t.string('secret', 40).notNullable()
		}),
		knex.schema.createTable('feed_items', t => {
			t.increments('uid').primary();
			t.integer('feed')
				.notNullable()
				.index('idx_feed')
				.references('feeds.uid')
				.onDelete('CASCADE');
			t.string('url').notNullable();
			t.string('title').notNullable();
			t.string('description');
			t.datetime('added').notNullable().defaultTo('NOW()')
		})
	]);

};

exports.down = async function(knex) {
	knex.schema.dropTable('feeds')
};
