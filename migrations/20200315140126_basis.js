
exports.up = async function(knex) {
	return Promise.all([
		knex.schema.createTable('feeds', t => {
			t.increments('uid').primary();
			t.string('url').notNullable();
			t.string('title').notNullable();
			t.string('description');
			t.json('loadparams').notNullable();
			t.json('selectors').notNullable();
			t.integer('checkinterval').notNullable().unsigned();
			t.integer('maxitems').notNullable().unsigned().defaultsTo('50');
			t.datetime('created').notNullable().defaultTo('NOW()');
			t.datetime('lastcheck');
			t.datetime('nextcheck');
			t.integer('errorcount').notNullable().unsigned().defaultsTo('0');
			t.string('secret', 40).notNullable();
			t.json('log').notNullable();
		}),
		knex.schema.createTable('feed_items', t => {
			t.increments('uid').primary();
			t.integer('feed')
				.notNullable()
				.index('idx_feed')
				.references('feeds.uid')
				.onDelete('CASCADE');
			t.string('link').notNullable();
			t.string('title').notNullable();
			t.string('description');
			t.datetime('added').notNullable().defaultTo('NOW()');
		})
	]);

};

exports.down = async function(knex) {
	knex.schema.dropTable('feeds')
};
