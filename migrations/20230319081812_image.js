
exports.up = function(knex) {
	return knex.schema.alterTable('feed_items', t => {
		t.string('image');
	});
};

exports.down = function(knex) {
	return knex.schema.alterTable('feed_items', t => {
		t.dropColumn('image');
	});
};
