package user

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
)

func TestInitSQLiteConfiguresEveryConnection(t *testing.T) {
	t.Parallel()

	db := initSQLite(filepath.Join(t.TempDir(), "fmd.sqlite"))
	sqlDB, err := db.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Error(err)
		}
	})

	ctx := context.Background()
	conn1, err := sqlDB.Conn(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn1.Close()

	// Keep conn1 checked out so database/sql has to open another physical
	// connection. This catches PRAGMAs that were only applied once at startup.
	conn2, err := sqlDB.Conn(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn2.Close()

	for _, conn := range []*sql.Conn{conn1, conn2} {
		assertPragmaInt(t, ctx, conn, "foreign_keys", 1)
		assertPragmaInt(t, ctx, conn, "secure_delete", 1)
		assertPragmaInt(t, ctx, conn, "busy_timeout", 5000)

		var journalMode string
		if err := conn.QueryRowContext(ctx, "PRAGMA journal_mode").Scan(&journalMode); err != nil {
			t.Fatal(err)
		}
		if journalMode != "wal" {
			t.Errorf("journal_mode = %q, want %q", journalMode, "wal")
		}
	}
}

func TestSQLiteCRUDAndForeignKeys(t *testing.T) {
	t.Parallel()

	db := initSQLite(filepath.Join(t.TempDir(), "fmd.sqlite"))
	sqlDB, err := db.DB.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Error(err)
		}
	})

	user := FMDUser{Username: "alice", HashedPassword: "hash"}
	if result := db.DB.Create(&user); result.Error != nil {
		t.Fatal(result.Error)
	}
	if result := db.DB.Create(&Location{UserID: user.Id, Position: "encrypted-location"}); result.Error != nil {
		t.Fatal(result.Error)
	}
	if result := db.DB.Create(&Picture{UserID: user.Id, Content: "encrypted-picture"}); result.Error != nil {
		t.Fatal(result.Error)
	}

	got, err := db.GetByName("alice")
	if err != nil {
		t.Fatal(err)
	}
	db.PreloadLocations(got)
	db.PreloadPictures(got)
	if len(got.Locations) != 1 || len(got.Pictures) != 1 {
		t.Fatalf("loaded %d locations and %d pictures, want 1 each", len(got.Locations), len(got.Pictures))
	}

	// Delete without GORM's association helper to verify that SQLite itself
	// enforces the schema's ON DELETE CASCADE constraint.
	if result := db.DB.Delete(got); result.Error != nil {
		t.Fatal(result.Error)
	}
	for name, model := range map[string]any{"locations": &Location{}, "pictures": &Picture{}} {
		var count int64
		if result := db.DB.Model(model).Count(&count); result.Error != nil {
			t.Fatal(result.Error)
		}
		if count != 0 {
			t.Errorf("%s count = %d after deleting user, want 0", name, count)
		}
	}
}

func assertPragmaInt(t *testing.T, ctx context.Context, conn *sql.Conn, name string, want int) {
	t.Helper()

	var got int
	if err := conn.QueryRowContext(ctx, "PRAGMA "+name).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Errorf("%s = %d, want %d", name, got, want)
	}
}
