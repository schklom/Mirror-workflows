package user

import (
	"crypto/rand"
	"encoding/json"
	"errors"
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

func (u *UserRepository) Init(dbDir string, userIDLength int, maxSavedLoc int, maxSavedPic int) {
	u.userIDLength = userIDLength
	u.maxSavedLoc = maxSavedLoc
	u.maxSavedPic = maxSavedPic

	dbFile := filepath.Join(dbDir, "fmd.sqlite")

	// Check if SQL Database exists
	_, err := os.Stat(dbFile)
	if os.IsNotExist(err) {
		fmt.Println("No SQLite DB found")

		// Create directory
		err := os.MkdirAll(filepath.Join(dbDir), 0770)
		if err != nil {
			log.Fatal("Failed to create dbDir:", err)
		}

		// Create file
		_, err = os.Create(dbFile)
		if err != nil {
			log.Fatal("Failed to create database:", err)
		}
	}
	u.UB = initSQLite(dbFile)
}

func (u *UserRepository) CheckAccessTokenAndGetUser(providedAccessToken string) (*FMDUser, error) {
	userId, err := u.ACC.CheckAccessToken(providedAccessToken)
	if err != nil {
		return nil, err
	}
	return u.UB.GetByID(userId)
}

func (u *UserRepository) CreateNewUser(privKey string, pubKey string, salt string, hashedPassword string) string {
	id := u.generateNewId()
	u.UB.Create(&FMDUser{UID: id, Salt: salt, HashedPassword: hashedPassword, PrivateKey: privKey, PublicKey: pubKey})
	return id
}

func (u *UserRepository) UpdateUserPassword(user *FMDUser, privKey string, salt string, hashedPassword string) {
	user.HashedPassword = hashedPassword
	user.Salt = salt
	user.PrivateKey = privKey
	u.UB.Save(&user)
}

func (u *UserRepository) AddLocation(user *FMDUser, loc string) {
	u.UB.PreloadLocations(user)

	u.UB.Create(&Location{Position: loc, UserID: user.Id})

	if len(user.Locations) > u.maxSavedLoc {
		locationsToDelete := user.Locations[:(len(user.Locations) - u.maxSavedLoc)]
		for _, locationToDelete := range locationsToDelete {
			u.UB.Delete(&locationToDelete)
		}
	}
}

func (u *UserRepository) AddPicture(user *FMDUser, pic string) {
	u.UB.PreloadPictures(user)

	u.UB.Create(&Picture{Content: pic, UserID: user.Id})

	if len(user.Pictures) > u.maxSavedPic {
		picturesToDelete := user.Pictures[:(len(user.Pictures) - u.maxSavedPic)]
		for _, pictureToDelete := range picturesToDelete {
			u.UB.Delete(&pictureToDelete)
		}
	}
}

func (u *UserRepository) DeleteUser(user *FMDUser) {
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&Picture{})
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&Location{})
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&CommandLogEntry{})
	u.UB.Delete(&user)
}

func (u *UserRepository) GetLocation(user *FMDUser, idx int) string {
	u.UB.PreloadLocations(user)

	if idx < 0 || idx >= len(user.Locations) {
		fmt.Printf("Location out of bounds: %d, max=%d\n", idx, len(user.Locations)-1)
		return ""
	}
	return user.Locations[idx].Position
}

func (u *UserRepository) GetAllLocations(user *FMDUser) []string {
	u.UB.PreloadLocations(user)

	locations := make([]string, len(user.Locations))
	for i, location := range user.Locations {
		locations[i] = location.Position
	}

	return locations
}

func (u *UserRepository) GetPicture(user *FMDUser, idx int) string {
	u.UB.PreloadPictures(user)

	if len(user.Pictures) == 0 {
		return "Picture not found"
	}
	return user.Pictures[idx].Content
}

func (u *UserRepository) GetAllPictures(user *FMDUser) []string {
	u.UB.PreloadPictures(user)

	if len(user.Pictures) == 0 {
		return []string{}
	}

	pictures := make([]string, len(user.Pictures))
	for i, picture := range user.Pictures {
		pictures[i] = picture.Content
	}

	return pictures
}

func (u *UserRepository) GetPictureSize(user *FMDUser) int {
	u.UB.PreloadPictures(user)
	return len(user.Pictures)
}

func (u *UserRepository) GetLocationSize(user *FMDUser) int {
	u.UB.PreloadLocations(user)
	return len(user.Locations)
}

func (u *UserRepository) GetPrivateKey(user *FMDUser) string {
	return user.PrivateKey
}

func (u *UserRepository) SetPrivateKey(user *FMDUser, key string) {
	user.PrivateKey = key
	u.UB.Save(&user)
}

func (u *UserRepository) GetPublicKey(user *FMDUser) string {
	return user.PublicKey
}

func (u *UserRepository) SetPublicKey(user *FMDUser, key string) {
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

func (u *UserRepository) SetCommandToUser(user *FMDUser, cmd string) {
	user.CommandToUser = cmd

	if cmd != "" {
		logEntry := fmt.Sprintf("Command \"%s\" sent to server!", cmd)
		u.addCommandLogEntry(user, logEntry)
	}
	u.UB.Save(&user)
}

func (u *UserRepository) GetCommandToUser(user *FMDUser) string {
	if user.CommandToUser != "" {
		logEntry := fmt.Sprintf("Command \"%s\" received by device!", user.CommandToUser)
		u.addCommandLogEntry(user, logEntry)
	}
	return user.CommandToUser
}

func (u *UserRepository) GetCommandLog(user *FMDUser) string {
	commandLog := ""
	for _, logEntry := range user.CommandLogs {
		commandLog += logEntry.Content + "\n"
	}
	return commandLog
}

func (u *UserRepository) SetPushUrl(user *FMDUser, pushUrl string) {
	user.PushUrl = pushUrl
	u.UB.Save(&user)
}

func (u *UserRepository) GetPushUrl(user *FMDUser) string {
	return user.PushUrl
}

func (u *UserRepository) generateNewId() string {
	for {
		newId := genRandomString(u.userIDLength)
		user, _ := u.UB.GetByID(newId)
		if user == nil {
			return newId
		}
	}
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
	user, err := u.UB.GetByID(id)
	if err != nil {
		return ""
	}
	if user.Salt != "" {
		return user.Salt
	}
	return getSaltFromArgon2EncodedHash(user.HashedPassword)
}

var ErrAccountLocked = errors.New("too many attempts, account locked")

func (u *UserRepository) RequestAccess(id string, hashedPW string, sessionDurationSeconds uint64) (*AccessToken, error) {
	user, err := u.UB.GetByID(id)
	if err != nil {
		return nil, err
	}

	if u.ACC.IsLocked(id) {
		u.SetCommandToUser(user, "423")
		return nil, ErrAccountLocked
	}

	if strings.EqualFold(strings.ToLower(user.HashedPassword), strings.ToLower(hashedPW)) {
		u.ACC.ResetLock(id)
		token := u.ACC.CreateNewAccessToken(id, sessionDurationSeconds)
		return &token, nil
	} else {
		u.ACC.IncrementLock(id)
		return nil, errors.New("wrong password")
	}
}
