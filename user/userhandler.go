package user

import (
	"math/rand"
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

func (u *UserIO) Init(userIDLength int, maxSavedLoc int, maxSavedPic int) {
	u.userIDLength = userIDLength
	u.maxSavedLoc = maxSavedLoc
	u.maxSavedPic = maxSavedPic
	u.UB = initDB()
}

func (u *UserIO) CreateNewUser(privKey string, pubKey string, hashedPassword string) string {
	id := u.generateNewId()
	u.UB.Put(&User{UID: id, HashedPassword: hashedPassword, PrivateKey: privKey, PublicKey: pubKey})
	return id
}

func (u *UserIO) CreateNewUserCT(uid string, privKey string, pubKey string, hashedPassword string) {
	u.UB.Put(&User{UID: uid, HashedPassword: hashedPassword, PrivateKey: privKey, PublicKey: pubKey})
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
		user.Pictures = user.LocationData[(len(user.Pictures) - u.maxSavedPic):]
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

func (u *UserIO) GetPicture(id string) string {
	user := u.UB.GetByID(id)
	if len(user.Pictures) == 0 {
		return "Picture not found"
	}
	return user.Pictures[0]
}

func (u *UserIO) GetLocationSize(id string) (int, int) {
	user := u.UB.GetByID(id)
	return len(user.LocationData) - 1, 0
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
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	s := make([]rune, u.userIDLength)
	rand.Seed(time.Now().Unix())
	for i := range s {
		s[i] = letters[rand.Intn(len(letters))]
	}
	newId := string(s)
	if u.UB.GetByID(newId) != nil {
		newId = u.generateNewId()
	}
	return newId
}

func (u *UserIO) RequestAccess(id string, hashedPW string) (bool, AccessToken) {
	user := u.UB.GetByID(id)
	if user != nil {
		if strings.EqualFold(user.HashedPassword, hashedPW) {
			return true, u.ACC.PutAccess(id, u.generateNewId())
		}
	}
	var a AccessToken
	return false, a
}
