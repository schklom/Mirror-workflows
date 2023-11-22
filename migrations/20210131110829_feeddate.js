
export async function up(knex) {
	return knex.schema.alterTable('feed_items', t => {
		t.datetime('added').notNullable().defaultTo(knex.fn.now()).alter();
	});
};

export async function down(knex) {
	return knex.schema.alterTable('feed_items', t => {
		t.datetime('added').notNullable().defaultTo('NOW()').alter();
	});
};
