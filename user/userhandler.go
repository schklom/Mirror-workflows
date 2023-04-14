package user

import (
	"math/rand"
	"path/filepath"
	"strings"
	"time"
)

type UserIO struct {
	userIDLength int
	maxSavedLoc  int
	maxSavedPic  int
	ACC          AccessController
	UB           *UserBox
}

func (u *UserIO) Init(path string, userIDLength int, maxSavedLoc int, maxSavedPic int) {
	u.userIDLength = userIDLength
	u.maxSavedLoc = maxSavedLoc
	u.maxSavedPic = maxSavedPic
	path = filepath.Join(path, "objectbox")
	u.UB = initDB(path)
}

func (u *UserIO) CreateNewUser(privKey string, pubKey string, salt string, hashedPassword string) string {
	id := u.generateNewId()
	u.UB.Put(&User{UID: id, Salt: salt, HashedPassword: hashedPassword, PrivateKey: privKey, PublicKey: pubKey})
	return id
}

func (u *UserIO) CreateNewUserCT(uid string, salt, string, privKey string, pubKey string, hashedPassword string) {
	u.UB.Put(&User{UID: uid, Salt: salt, HashedPassword: hashedPassword, PrivateKey: privKey, PublicKey: pubKey})
}

func (u *UserIO) UpdateUserPassword(id string, privKey string, salt string, hashedPassword string) {
	user := u.UB.GetByID(id)
	user.HashedPassword = hashedPassword
	user.Salt = salt
	user.PrivateKey = privKey
	u.UB.Update(user)
}

func (u *UserIO) AddLocation(id string, loc string) {
	user := u.UB.GetByID(id)

	user.LocationData = append(user.LocationData, loc)

	if len(user.LocationData) > u.maxSavedLoc {
		user.LocationData = user.LocationData[(len(user.LocationData) - u.maxSavedLoc):]
	}
	u.UB.Update(user)
}

func (u *UserIO) AddPicture(id string, pic string) {
	user := u.UB.GetByID(id)

	user.Pictures = append(user.Pictures, pic)

	if len(user.Pictures) > u.maxSavedPic {
		user.Pictures = user.Pictures[(len(user.Pictures) - u.maxSavedPic):]
	}
	u.UB.Update(user)
}

func (u *UserIO) DeleteUser(id string) {
	user := u.UB.GetByID(id)

	u.UB.Remove(user)
}

func (u *UserIO) GetLocation(id string, pos int) string {
	user := u.UB.GetByID(id)
	if len(user.LocationData)-1 < pos {
		return ""
	}
	return user.LocationData[pos]
}

func (u *UserIO) GetPicture(id string, pos int) string {
	user := u.UB.GetByID(id)
	if len(user.Pictures) == 0 {
		return "Picture not found"
	}
	return user.Pictures[pos]
}

func (u *UserIO) GetPictureSize(id string) int {
	user := u.UB.GetByID(id)
	return len(user.Pictures) - 1
}

func (u *UserIO) GetLocationSize(id string) int {
	user := u.UB.GetByID(id)
	return len(user.LocationData) - 1
}

func (u *UserIO) GetPrivateKey(id string) string {
	user := u.UB.GetByID(id)
	return user.PrivateKey
}

func (u *UserIO) SetPrivateKey(id string, key string) {
	user := u.UB.GetByID(id)
	user.PrivateKey = key
	u.UB.Update(user)
}

func (u *UserIO) GetPublicKey(id string) string {
	user := u.UB.GetByID(id)
	return user.PublicKey
}

func (u *UserIO) SetPublicKey(id string, key string) {
	user := u.UB.GetByID(id)
	user.PublicKey = key
	u.UB.Update(user)
}

func (u *UserIO) SetCommandToUser(id string, ctu string) {
	user := u.UB.GetByID(id)
	user.CommandToUser = ctu
	u.UB.Update(user)
}

func (u *UserIO) GetCommandToUser(id string) string {
	user := u.UB.GetByID(id)
	return user.CommandToUser
}

func (u *UserIO) SetPushUrl(id string, pushUrl string) {
	user := u.UB.GetByID(id)
	user.PushUrl = pushUrl
	u.UB.Update(user)
}

func (u *UserIO) GetPushUrl(id string) string {
	user := u.UB.GetByID(id)
	return user.PushUrl
}

func (u *UserIO) generateNewId() string {
	newId := genId(u.userIDLength)
	for u.UB.GetByID(newId) != nil {
		newId = genId(u.userIDLength)
	}
	return newId
}

func genId(length int) string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	s := make([]rune, length)
	rand.Seed(time.Now().Unix())
	for i := range s {
		s[i] = letters[rand.Intn(len(letters))]
	}
	newId := string(s)
	return newId
}

func (u *UserIO) GetSalt(id string) string {
	user := u.UB.GetByID(id)
	return user.Salt
}

func (u *UserIO) RequestAccess(id string, hashedPW string) (bool, AccessToken) {
	user := u.UB.GetByID(id)
	if user != nil {
		if strings.EqualFold(user.HashedPassword, hashedPW) {
			return true, u.ACC.PutAccess(id)
		}
	}
	var a AccessToken
	return false, a
}
