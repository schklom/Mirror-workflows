
export async function up(knex) {
	return knex.schema.table('feeds', t => {
		t.boolean('inserterrorsasitems').defaultsTo(0);
		t.boolean('noitemsiserror').defaultsTo(0);
	})
};

export async function down(knex) {
	return knex.schema.table('feeds', t => {
		t.dropColumn('inserterrorsasitems')
		t.dropColumn('noitemsiserror');
	})
};
