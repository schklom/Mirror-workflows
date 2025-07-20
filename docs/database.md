# Database docs

Currently, only SQLite is supported.

## Migrations

There are two types of migrations:

1. Migrations of database structure, the traditional up/down migrations.
   For this, we write SQL code to create the database layout.
   They live in `migrations/`.
1. Migrations of data.
   Sometimes, we need to modify some data in the database to reformat something.
   For this, we write custom Go code.

The structural migrations are managed with
[`golang-migrate`](https://github.com/golang-migrate/migrate/tree/master).

### Migration template

Short option: copy and paste an existing migration file.

Long option:

Install the [`migrate` CLI](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate):

```sh
go install -tags 'sqlite' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

To create a new, empty migration file:

```sh
migrate create -ext sql -dir ./migrations/ -seq migration_name
```

### Writing migrations

The SQL in the migrations is written from hand, and SHOULD match the GORM models!

One way to write the SQL is:

1. Write/update the GORM model.
1. Temporarily add an [auto-migration](https://gorm.io/docs/migration.html#Auto-Migration).
1. Comment out the real, existing migrations.
1. Run FMD Server and let it auto-migrate an empty database.
1. View the SQL of the resulting SQLite database.
   For example, open the database in [`sqlitebrowser`](https://sqlitebrowser.org/)
   and look at the "Database Structure" tab.

This gives you the `CREATE` the statements.
From that you can manually derive the `UPDATE` statements that you need.

When possible/reasonable, add `IF NOT EXISTS`.
This ensures that migrations are idempotent and can savely be run multiple times.

### Down migrations

For now, we don't implement "down" migrations, only "up".
In almost all cases when you would want to migrate "down", your database is broken,
and it is better to manually inspect the situation manually than to rely on SQL scripts that
were written with a happy state in mind.
For some background, see [this blog post](https://atlasgo.io/blog/2024/04/01/migrate-down).

Therefore, the `migrations/*.down.sql` that the tool generates are kept empty (for now).

## Running migrations

The Go code runs the migrations when FMD Server starts.

In the rare case that you want to run the structural migrations manually, use the `migrate` CLI.

## Alternatives considered

[Atlas](https://atlasgo.io/guides/orms/gorm):

- Not free software. The Community Edition does not work with the GORM plugin.
- No easy way to run migrations from Go code (?).

[`golang-migrate`](https://github.com/golang-migrate/migrate):

- No way to pass in an `*sql.DB`, thus we would need to open the DB twice.
- We need to interleave structural migrations and data migrations.
  Thus we need custom code anyway.
- The SQLite driver [is cgo](https://github.com/golang-migrate/migrate/blob/ffdcb52/database/sqlite3/README.md).
  But we want pure Go to have reproducible builds.

=> Use GORM's `db.Exec` to execute the raw SQL statements manually.

## References

- <https://github.com/golang-migrate/migrate/blob/master/GETTING_STARTED.md>
- <https://betterstack.com/community/guides/scaling-go/golang-migrate/>
