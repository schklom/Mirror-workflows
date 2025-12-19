package user

import (
	"errors"
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

type FMDDB struct {
	DB *gorm.DB
}

// For GORM (SQL)
// User Table
type FMDUser struct {
	Id             uint64 `gorm:"primaryKey"`
	UID            string `gorm:"uniqueIndex"`
	Salt           string // salt for the inner password hash performed by the client. This is stored for returning it to the client. It is not used by the server.
	HashedPassword string
	PrivateKey     string
	PublicKey      string
	CommandToUser  string
	CommandTime    uint64
	CommandSig     string
	PushUrl        string
	LastSeenTime   int64
	Locations      []Location `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;"`
	Pictures       []Picture  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;"`
	//CommandLogs    []CommandLogEntry `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;"`
}

// Location Table of the Users
type Location struct {
	Id       uint64 `gorm:"primaryKey"`
	UserID   uint64 `gorm:"index"`
	Position string // elements must be string-encoded JSON structures
}

// Picture Table for the Users
type Picture struct {
	Id      uint64 `gorm:"primaryKey"`
	UserID  uint64 `gorm:"index"`
	Content string // elements are base64 encoded encrypted images
}

/*
// Location Table of the Users
type CommandLogEntry struct {
	Id      uint64 `gorm:"primaryKey"`
	UserID  uint64 `gorm:"index"`
	Content string // encrypted CommandLogEntryContent
}

// Content of the CommandLogEntry
type CommandLogEntryContent struct {
	Timestamp int64
	Log       string
}
*/

// Settings Table GORM (SQL)
type DBSetting struct {
	Id      uint64 `gorm:"primaryKey"`
	Setting string `gorm:"uniqueIndex"`
	Value   string
}

func NewFMDDB(dbDir string) *FMDDB {
	dbFile := filepath.Join(dbDir, "fmd.sqlite")

	// Check if SQL Database exists
	_, err := os.Stat(dbFile)
	if os.IsNotExist(err) {
		log.Info().Msg("no SQLite DB found, creating one")

		// Create directory
		err := os.MkdirAll(filepath.Join(dbDir), 0770)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to create dbDir")
		}

		// Create file
		_, err = os.Create(dbFile)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to create database file")
		}
	}
	return initSQLite(dbFile)
}

func initSQLite(path string) *FMDDB {
	newLogger := logger.New(
		&log.Logger, // io writer
		logger.Config{
			IgnoreRecordNotFoundError: false, // Ignore ErrRecordNotFound error for logger
			LogLevel:                  logger.Warn,
		},
	)

	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("failed to open database")
		os.Exit(1) // make nilaway happy
		return nil
	}

	// XXX: FK cascading deletion doesn't seem to work. But enabled FK anyway, just to be sure.
	// https://www.sqlite.org/foreignkeys.html#fk_enable
	res := db.Exec("PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON; PRAGMA journal_mode=WAL;")
	if res.Error != nil {
		log.Fatal().Err(err).Msg("failed setting pragmas")
		os.Exit(1) // make nilaway happy
		return nil
	}

	migrateDatabase(db)

	return &FMDDB{DB: db}
}

func (db *FMDDB) GetLastID() int {
	var user FMDUser
	db.DB.Last(&user)
	if user.Id == 0 {
		return -1
	}
	return int(user.Id)
}

func (db *FMDDB) GetByID(id string) (*FMDUser, error) {
	var user = FMDUser{UID: id}
	db.DB.Where(&user).Find(&user)
	if user.Id == 0 {
		return nil, errors.New("user not found")
	}
	return &user, nil
}

func (db *FMDDB) PreloadLocations(user *FMDUser) {
	db.DB.Preload("Locations").Where(&user).Find(&user)
}

func (db *FMDDB) PreloadPictures(user *FMDUser) {
	db.DB.Preload("Pictures").Where(&user).Find(&user)
}

func (db *FMDDB) Save(value interface{}) {
	db.DB.Save(value)
}

func (db *FMDDB) Create(value interface{}) {
	db.DB.Create(value)
}

func (db *FMDDB) Delete(value interface{}) {
	// Theoretically, this should work via foreign key + cascade.
	// It works when manually executing SQL commands via DB Browser, but not via gorm??
	// Thus, we manually select the associations here to do the cascading deletion.
	// https://gorm.io/docs/associations.html#Delete-Associations
	db.DB.Select(clause.Associations).Delete(value)
}
