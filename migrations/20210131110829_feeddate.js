
exports.up = function(knex) {
	return knex.schema.alterTable('feed_items', t => {
		t.datetime('added').notNullable().defaultTo(knex.fn.now()).alter();
	});
};

exports.down = function(knex) {
	return knex.schema.alterTable('feed_items', t => {
		t.datetime('added').notNullable().defaultTo('NOW()').alter();
	});
};
