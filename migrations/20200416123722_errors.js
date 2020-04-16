
exports.up = function(knex) {
	return knex.schema.table('feeds', t => {
		t.boolean('inserterrorsasitems').defaultsTo(0);
		t.boolean('noitemsiserror').defaultsTo(0);
	})
};

exports.down = function(knex) {
	return knex.schema.table('feeds', t => {
		t.dropColumn('inserterrorsasitems')
		t.dropColumn('noitemsiserror');
	})
};
