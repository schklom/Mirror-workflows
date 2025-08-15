package user

import (
	"errors"
	"fmd-server/migrations"
	"fmt"
	"strconv"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

const CurrentSqlVersion = 2

const KeyVersion = "fmd_db_version"

func migrateDatabase(db *gorm.DB) {
	log.Info().Msg("migrating database...")

	// This initial migration MUST be idempotent.
	// It should use IF NOT EXISTS in order to work correctly
	// with existing installtions (and not break them).
	err := runMigration("000001_create_tables", db)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create initial database layout")
		return
	}

	var dbSetting DBSetting
	res := db.First(&dbSetting, "setting = ?", KeyVersion)

	if errors.Is(res.Error, gorm.ErrRecordNotFound) {
		log.Info().Msg("schema version does not yet exist, creating it")
		dbSetting = DBSetting{Setting: KeyVersion, Value: "0"}
		db.Create(&dbSetting)
	}

	actualVersion, err := strconv.Atoi(dbSetting.Value)
	if err != nil {
		log.Warn().Err(err).Msg("failed to get current schema version")
		// Log warning, and continue to try and migrate the database
	}

	log.Info().
		Int("actualVersion", actualVersion).
		Int("CurrentSqlVersion", CurrentSqlVersion).
		Msg("db versions")

	if actualVersion >= CurrentSqlVersion {
		log.Info().Msg("nothing to migrate")
		return
	}

	if actualVersion < 2 {
		err := runMigration("000002_add_last_seen_time", db)
		if err != nil {
			log.Fatal().Err(err).Msg("failed migration=000002_add_last_seen_time")
			return
		}
	}

	// Use this to let GORM write a migration. Then inspect the created SQLite schema,
	// and write an "up" migration from hand.
	// db.AutoMigrate(&DBSetting{})

	// Set this at the end. This way, if the migrations are interrupted
	// (e.g., the program cancelled), they are re-run upon the next start.
	db.Model(&dbSetting).Update("Value", fmt.Sprint(CurrentSqlVersion))
	log.Info().Msg("database successfully migrated")
}

func runMigration(name string, db *gorm.DB) error {
	sql, err := migrations.MigrationFS.ReadFile(fmt.Sprintf("%s.up.sql", name))
	if err != nil {
		return err
	}
	err = db.Exec(string(sql)).Error
	return err
}
