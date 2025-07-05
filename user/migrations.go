package user

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

const CurrentSqlVersion = 1

const KeyVersion = "fmd_db_version"

func migrateDatabase(db *gorm.DB) {
	log.Info().Msg("migrating database...")

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

	// Set this at the end. This way, if the migrations are interrupted
	// (e.g., the program cancelled), they are re-run upon the next start.
	db.Model(&dbSetting).Update("Value", fmt.Sprint(CurrentSqlVersion))
	log.Info().Msg("database successfully migrated")
}
