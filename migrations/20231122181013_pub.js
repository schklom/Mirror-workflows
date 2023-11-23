
export async function up(knex) {

	return knex.schema.alterTable('feeds', t => {
		t.string('managementkey').index();
		t.datetime('lastretrieval').index();
	});
};

export async function down(knex) {
	return knex.schema.alterTable('feeds', t => {
		t.dropColumn('managementkey');
		t.dropColumn('lastretrieval');
	});
};
