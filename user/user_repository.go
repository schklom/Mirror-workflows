package user

import (
	"crypto/rand"
	"encoding/json"
	"findmydeviceserver/utils"
	"fmt"
	"log"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type UserRepository struct {
	userIDLength int
	maxSavedLoc  int
	maxSavedPic  int
	ACC          AccessController
	UB           *FMDDB
}

func (u *UserRepository) Init(path string, userIDLength int, maxSavedLoc int, maxSavedPic int) {
	u.userIDLength = userIDLength
	u.maxSavedLoc = maxSavedLoc
	u.maxSavedPic = maxSavedPic

	dbPath := filepath.Join(path, "db", "fmd.sqlite")

	// Check if SQL Database exists
	_, err := os.Stat(dbPath)
	if os.IsNotExist(err) {
		fmt.Println("No SQLite DB found")

		_, err = os.Create(dbPath)
		if err != nil {
			log.Fatal("Failed to create database:", err)
		}

		// Migrate old objectbox, if it exists
		objectBoxPath := filepath.Join(path, "objectbox")
		_, err := os.Stat(objectBoxPath)
		if err == nil {
			fmt.Println("Found ObjectBox DB to migrate")
			oldDB := initObjectBox(objectBoxPath)
			newDB := initSQLite(dbPath)
			migrateObjectboxToSQL(oldDB, newDB)
		} else {
			fmt.Println("Creating new DB")
		}

	}
	u.UB = initSQLite(dbPath)
}

func (u *UserRepository) CreateNewUser(privKey string, pubKey string, salt string, hashedPassword string) string {
	id := u.generateNewId()
	u.UB.Create(&FMDUser{UID: id, Salt: salt, HashedPassword: hashedPassword, PrivateKey: privKey, PublicKey: pubKey})
	return id
}

func (u *UserRepository) UpdateUserPassword(id string, privKey string, salt string, hashedPassword string) {
	user := u.UB.GetByID(id)
	user.HashedPassword = hashedPassword
	user.Salt = salt
	user.PrivateKey = privKey
	u.UB.Save(&user)
}

func (u *UserRepository) AddLocation(id string, loc string) {
	user := u.UB.GetByID(id)

	u.UB.Create(&Location{Position: loc, UserID: user.Id})

	if len(user.Locations) > u.maxSavedLoc {
		locationsToDelete := user.Locations[:(len(user.Locations) - u.maxSavedLoc)]
		for _, locationToDelete := range locationsToDelete {
			u.UB.Delete(&locationToDelete)
		}
	}
}

func (u *UserRepository) AddPicture(id string, pic string) {
	user := u.UB.GetByID(id)
	u.UB.Create(&Picture{Content: pic, UserID: user.Id})

	if len(user.Pictures) > u.maxSavedPic {
		picturesToDelete := user.Pictures[:(len(user.Pictures) - u.maxSavedPic)]
		for _, pictureToDelete := range picturesToDelete {
			u.UB.Delete(&pictureToDelete)
		}
	}
}

func (u *UserRepository) DeleteUser(uid string) {
	user := u.UB.GetByID(uid)
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&Picture{})
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&Location{})
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&CommandLogEntry{})
	u.UB.Delete(&user)
}

func (u *UserRepository) GetLocation(id string, idx int) string {
	user := u.UB.GetByID(id)
	if idx < 0 || idx >= len(user.Locations) {
		fmt.Printf("Location out of bounds: %d, max=%d\n", idx, len(user.Locations)-1)
		return ""
	}
	return user.Locations[idx].Position
}

func (u *UserRepository) GetPicture(id string, idx int) string {
	user := u.UB.GetByID(id)
	if len(user.Pictures) == 0 {
		return "Picture not found"
	}
	return user.Pictures[idx].Content
}

func (u *UserRepository) GetPictureSize(id string) int {
	user := u.UB.GetByID(id)
	return len(user.Pictures)
}

func (u *UserRepository) GetLocationSize(id string) int {
	user := u.UB.GetByID(id)
	return len(user.Locations)
}

func (u *UserRepository) GetPrivateKey(id string) string {
	user := u.UB.GetByID(id)
	return user.PrivateKey
}

func (u *UserRepository) SetPrivateKey(id string, key string) {
	user := u.UB.GetByID(id)
	user.PrivateKey = key
	u.UB.Save(&user)
}

func (u *UserRepository) GetPublicKey(id string) string {
	user := u.UB.GetByID(id)
	return user.PublicKey
}

func (u *UserRepository) SetPublicKey(id string, key string) {
	user := u.UB.GetByID(id)
	user.PublicKey = key
	u.UB.Save(&user)
}

func (u *UserRepository) addCommandLogEntry(user *FMDUser, entry string) {
	timestamp := time.Now().Unix()

	logEntry := CommandLogEntryContent{Timestamp: timestamp, Log: entry}
	jsonLog, _ := json.Marshal(logEntry)

	logEntryEncrypted := utils.RsaEncrypt(user.PublicKey, jsonLog)
	comLogEntry := CommandLogEntry{UserID: user.Id, Content: logEntryEncrypted}

	u.UB.Create(&comLogEntry)
}

func (u *UserRepository) SetCommandToUser(id string, cmd string) {
	user := u.UB.GetByID(id)
	user.CommandToUser = cmd

	if cmd != "" {
		logEntry := fmt.Sprintf("Command \"%s\" sent to server!", cmd)
		u.addCommandLogEntry(user, logEntry)
	}
	u.UB.Save(&user)
}

func (u *UserRepository) GetCommandToUser(id string) string {
	user := u.UB.GetByID(id)

	if user.CommandToUser != "" {
		logEntry := fmt.Sprintf("Command \"%s\" received by device!", user.CommandToUser)
		u.addCommandLogEntry(user, logEntry)
	}
	return user.CommandToUser
}

func (u *UserRepository) GetCommandLog(id string) string {
	user := u.UB.GetByID(id)
	commandLog := ""
	for _, logEntry := range user.CommandLogs {
		commandLog += logEntry.Content + "\n"
	}
	return commandLog
}

func (u *UserRepository) SetPushUrl(id string, pushUrl string) {
	user := u.UB.GetByID(id)
	user.PushUrl = pushUrl
	u.UB.Save(&user)
}

func (u *UserRepository) GetPushUrl(id string) string {
	user := u.UB.GetByID(id)
	return user.PushUrl
}

func (u *UserRepository) generateNewId() string {
	newId := genRandomString(u.userIDLength)
	for u.UB.GetByID(newId) != nil {
		newId = genRandomString(u.userIDLength)
	}
	return newId
}

func genRandomString(length int) string {
	// a-z, A-Z, 0-9 excluding 0, O, l, I, and 1 (see #29)
	var letters = []rune("abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789")
	s := make([]rune, length)
	for i := range s {
		nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			panic(err)
		}
		s[i] = letters[nBig.Int64()]
	}
	newId := string(s)
	return newId
}

func (u *UserRepository) GetSalt(id string) string {
	user := u.UB.GetByID(id)
	if user == nil {
		return ""
	}
	if user.Salt != "" {
		return user.Salt
	}
	return getSaltFromArgon2EncodedHash(user.HashedPassword)
}

func (u *UserRepository) RequestAccess(id string, hashedPW string, sessionDurationSeconds uint64) (*AccessToken, bool) {
	user := u.UB.GetByID(id)
	if user != nil {
		if strings.EqualFold(strings.ToLower(user.HashedPassword), strings.ToLower(hashedPW)) {
			u.ACC.ResetLock(id)
			token := u.ACC.CreateNewAccessToken(id, sessionDurationSeconds)
			return &token, true
		}
	}
	return nil, false
}
