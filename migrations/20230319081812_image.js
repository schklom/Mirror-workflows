
export async function up(knex) {
	return knex.schema.alterTable('feed_items', t => {
		t.string('image');
	});
};

export async function down(knex) {
	return knex.schema.alterTable('feed_items', t => {
		t.dropColumn('image');
	});
};
