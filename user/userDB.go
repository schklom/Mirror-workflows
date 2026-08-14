package user

import (
	"errors"
	"net/url"
	"os"
	"path/filepath"

	"github.com/ncruces/go-sqlite3/gormlite"
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
	Username       string `gorm:"uniqueIndex"`
	Salt           string // salt for the inner password hash performed by the client. This is stored for returning it to the client. It is not used by the server.
	HashedPassword string
	PushUrl        string
	LastSeenTime   int64

	// Deprecated crypto protocol
	PrivateKey    string
	PublicKey     string
	CommandToUser string
	CommandTime   uint64
	CommandSig    string
	Locations     []Location `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;"`
	Pictures      []Picture  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;"`
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

// Settings Table GORM (SQL)
type DBSetting struct {
	Id      uint64 `gorm:"primaryKey"`
	Setting string `gorm:"uniqueIndex"`
	Value   string
}

func NewFMDDB(dbDir string) *FMDDB {
	dbFile := filepath.Join(dbDir, "fmd.sqlite")

	_, err := os.Stat(dbFile)
	if os.IsNotExist(err) {
		log.Info().Msg("no SQLite DB found, creating one")

		// Create directory
		err := os.MkdirAll(filepath.Join(dbDir), 0770)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to create dbDir")
		}

		// Create file
		_, err = os.OpenFile(dbFile, os.O_RDWR|os.O_CREATE|os.O_EXCL, 0660)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to create database file")
		}
	}

	info, err := os.Stat(dbFile)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to access database file")
		os.Exit(1) // make nilaway happy
	}

	// Enforce that the DB file is not globally accessible
	_ = os.Chmod(filepath.Join(dbDir, "fmd.sqlite"), info.Mode()&^0007)
	_ = os.Chmod(filepath.Join(dbDir, "fmd.sqlite-shm"), info.Mode()&^0007)
	_ = os.Chmod(filepath.Join(dbDir, "fmd.sqlite-wal"), info.Mode()&^0007)

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

	// These PRAGMAs must be set for every connection opened by database/sql.
	// In particular, foreign_keys is connection-local, so executing it once
	// after gorm.Open does not reliably enable it for the whole connection pool.
	query := url.Values{}
	query.Add("_pragma", "busy_timeout(5000)")
	query.Add("_pragma", "foreign_keys(ON)")
	query.Add("_pragma", "secure_delete(ON)")
	query.Add("_pragma", "journal_mode(WAL)")
	dsn := (&url.URL{
		Scheme:   "file",
		OmitHost: true,
		Path:     filepath.ToSlash(path),
		RawQuery: query.Encode(),
	}).String()

	db, err := gorm.Open(gormlite.Open(dsn), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("failed to open database")
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

func (db *FMDDB) GetByName(username string) (*FMDUser, error) {
	var user = FMDUser{Username: username}
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

func (db *FMDDB) Delete(value interface{}) int64 {
	// Theoretically, this should work via foreign key + cascade.
	// It works when manually executing SQL commands via DB Browser, but not via gorm??
	// Thus, we manually select the associations here to do the cascading deletion.
	// https://gorm.io/docs/associations.html#Delete-Associations
	var result = db.DB.Select(clause.Associations).Delete(value)
	return result.RowsAffected
}

func (db *FMDDB) GetUsersCount() (int64, error) {
	var count int64
	result := db.DB.Model(&FMDUser{}).Count(&count)

	if result.Error != nil {
		return -1, result.Error
	}
	return count, nil
}

func (db *FMDDB) GetUsersLastSeenBefore(unixSeconds int64) ([]FMDUser, error) {
	var users []FMDUser

	result := db.DB.
		// Select only the fields that are necessary for where this function is used.
		Select("username", "last_seen_time", "push_url").
		Where("last_seen_time < ?", unixSeconds).
		// Order: First all empty push URLs. Then from old to new last seen times.
		Order("(push_url IS NULL OR push_url = '') DESC, last_seen_time ASC, username ASC").
		Find(&users)

	if result.Error != nil {
		return nil, result.Error
	}
	return users, nil
}
