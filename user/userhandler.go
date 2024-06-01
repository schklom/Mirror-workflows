package user

import (
	"crypto/rand"
	"findmydeviceserver/utils"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type UserIO struct {
	userIDLength int
	maxSavedLoc  int
	maxSavedPic  int
	ACC          AccessController
	UB           *FMDDB
}

func (u *UserIO) Init(path string, userIDLength int, maxSavedLoc int, maxSavedPic int) {
	u.userIDLength = userIDLength
	u.maxSavedLoc = maxSavedLoc
	u.maxSavedPic = maxSavedPic
	dbPath := filepath.Join(path, "fmd.db")
	_, err := os.Stat(dbPath)
	if os.IsNotExist(err) { // Check if SQL Database exists
		fmt.Println("No SQL DB found")
		objectBoxPath := filepath.Join(path, "objectbox")
		_, err := os.Stat(objectBoxPath)
		print(objectBoxPath)
		fmt.Println(err)
		if err == nil { // If the SQL Database doesn't exist, check for an objectbox Databse to migrate
			fmt.Println("ObjectBox DB to migrate found")
			oldDB := initObjectBox(objectBoxPath)
			newDB := initSQLite(dbPath)
			migrateToV3(oldDB, newDB)
		}

	}
	u.UB = initSQLite(dbPath)

}

func (u *UserIO) CreateNewUser(privKey string, pubKey string, salt string, hashedPassword string) string {
	id := u.generateNewId()
	u.UB.Create(&FMDUser{UID: id, Salt: salt, HashedPassword: hashedPassword, PrivateKey: privKey, PublicKey: pubKey})
	return id
}

func (u *UserIO) UpdateUserPassword(id string, privKey string, salt string, hashedPassword string) {
	user := u.UB.GetByID(id)
	user.HashedPassword = hashedPassword
	user.Salt = salt
	user.PrivateKey = privKey
	u.UB.Save(&user)
}

func (u *UserIO) AddLocation(id string, loc string) {
	user := u.UB.GetByID(id)

	u.UB.Create(&Location{Position: loc, UserID: user.Id})

	if len(user.Locations) > u.maxSavedLoc {
		locationsToDelete := user.Locations[:(len(user.Locations) - u.maxSavedLoc)]
		for _, locationToDelete := range locationsToDelete {
			u.UB.Delete(&locationToDelete)
		}
	}
}

func (u *UserIO) AddPicture(id string, pic string) {
	user := u.UB.GetByID(id)
	u.UB.Create(&Picture{Content: pic, UserID: user.Id})

	if len(user.Pictures) > u.maxSavedPic {
		picturesToDelete := user.Pictures[:(len(user.Pictures) - u.maxSavedPic)]
		for _, pictureToDelete := range picturesToDelete {
			u.UB.Delete(&pictureToDelete)
		}
	}
}

func (u *UserIO) DeleteUser(uid string) {
	user := u.UB.GetByID(uid)
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&Picture{})
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&Location{})
	u.UB.DB.Where("user_id = ?", user.Id).Delete(&CommandLogEntry{})
	u.UB.Delete(&user)
}

func (u *UserIO) GetLocation(id string, idx int) string {
	user := u.UB.GetByID(id)
	if idx < 0 || idx >= len(user.Locations) {
		fmt.Printf("Location out of bounds: %d, max=%d\n", idx, len(user.Locations)-1)
		return ""
	}
	return user.Locations[idx].Position
}

func (u *UserIO) GetPicture(id string, idx int) string {
	user := u.UB.GetByID(id)
	if len(user.Pictures) == 0 {
		return "Picture not found"
	}
	return user.Pictures[idx].Content
}

func (u *UserIO) GetPictureSize(id string) int {
	user := u.UB.GetByID(id)
	return len(user.Pictures)
}

func (u *UserIO) GetLocationSize(id string) int {
	user := u.UB.GetByID(id)
	return len(user.Locations)
}

func (u *UserIO) GetPrivateKey(id string) string {
	user := u.UB.GetByID(id)
	return user.PrivateKey
}

func (u *UserIO) SetPrivateKey(id string, key string) {
	user := u.UB.GetByID(id)
	user.PrivateKey = key
	u.UB.Save(&user)
}

func (u *UserIO) GetPublicKey(id string) string {
	user := u.UB.GetByID(id)
	return user.PublicKey
}

func (u *UserIO) SetPublicKey(id string, key string) {
	user := u.UB.GetByID(id)
	user.PublicKey = key
	u.UB.Save(&user)
}

func (u *UserIO) SetCommandToUser(id string, ctu string) {
	user := u.UB.GetByID(id)
	user.CommandToUser = ctu
	if ctu != "" {
		timestamp := time.Now().Unix()
		logContent := utils.RsaEncrypt(user.PublicKey, "New Com sent "+ctu)
		comLogEntry := CommandLogEntry{UserID: user.Id, Timestamp: timestamp, Content: logContent}
		u.UB.Create(&comLogEntry)
	}
	u.UB.Save(&user)
}

func (u *UserIO) GetCommandToUser(id string) string {
	user := u.UB.GetByID(id)
	timestamp := time.Now().Unix()
	logContent := utils.RsaEncrypt(user.PublicKey, "Command \""+user.CommandToUser+"\" received by device!")
	comLogEntry := CommandLogEntry{UserID: user.Id, Timestamp: timestamp, Content: logContent}
	u.UB.Create(&comLogEntry)
	return user.CommandToUser
}

func (u *UserIO) GetCommandLogs(id string) string {
	user := u.UB.GetByID(id)
	commandLogs := ""
	for _, logEntry := range user.CommandLogs {
		commandLogs += time.Unix(logEntry.Timestamp, 0).UTC().Format(time.RFC822) + ": " + logEntry.Content + "\n"
	}
	return commandLogs
}

func (u *UserIO) SetPushUrl(id string, pushUrl string) {
	user := u.UB.GetByID(id)
	user.PushUrl = pushUrl
	u.UB.Save(&user)
}

func (u *UserIO) GetPushUrl(id string) string {
	user := u.UB.GetByID(id)
	return user.PushUrl
}

func (u *UserIO) generateNewId() string {
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

func (u *UserIO) GetSalt(id string) string {
	user := u.UB.GetByID(id)
	if user == nil {
		return ""
	}
	if user.Salt != "" {
		return user.Salt
	}
	return getSaltFromArgon2EncodedHash(user.HashedPassword)
}

func (u *UserIO) RequestAccess(id string, hashedPW string) (bool, AccessToken) {
	user := u.UB.GetByID(id)
	if user != nil {
		if strings.EqualFold(strings.ToLower(user.HashedPassword), strings.ToLower(hashedPW)) {
			u.ACC.ResetLock(id)
			return true, u.ACC.PutAccess(id)
		}
	}
	var a AccessToken
	return false, a
}
