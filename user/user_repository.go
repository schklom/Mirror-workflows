package user

import (
	"bytes"
	"crypto/rand"
	"errors"
	"math/big"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type UserRepository struct {
	userIDLength int
	maxSavedLoc  int
	maxSavedPic  int
	ACC          AccessController
	UB           *FMDDB
}

func NewUserRepository(dbDir string, userIDLength int, maxSavedLoc int, maxSavedPic int) UserRepository {
	return UserRepository{
		userIDLength: userIDLength,
		maxSavedLoc:  maxSavedLoc,
		maxSavedPic:  maxSavedPic,
		ACC:          NewAccessController(),
		UB:           NewFMDDB(dbDir),
	}
}

func (u *UserRepository) CheckAccessTokenAndGetUser(providedAccessToken string) (*FMDUser, error) {
	userId, err := u.ACC.CheckAccessToken(providedAccessToken)
	if err != nil {
		return nil, err
	}

	user, err := u.UB.GetByID(userId)
	if err != nil {
		return nil, err
	}

	user.LastSeenTime = time.Now().Unix()
	u.UB.Save(&user)

	return user, nil
}

var ErrUsernameInvalid = errors.New("the requested username must be alphanumeric")
var ErrUsernameTooLong = errors.New("the requested username must be <= 64 characters")
var ErrUsernameNotAvailable = errors.New("the requested username is not available")

// alphanumeric and - and _
var IsUserIdValid = regexp.MustCompile("^[-_a-zA-Z0-9]+$").MatchString

const USERNAME_MAX_LENGTH = 64

func (u *UserRepository) CreateNewUser(
	privKey string,
	pubKey string,
	salt string,
	hashedPassword string,
	requestedUsername string,
) (string, error) {
	id := ""
	if requestedUsername != "" {
		if !IsUserIdValid(requestedUsername) {
			log.Warn().Str("userid", requestedUsername).Msg("requested username is not alphanumeric")
			return "", ErrUsernameInvalid
		}

		if len(requestedUsername) > USERNAME_MAX_LENGTH {
			log.Warn().
				Str("userid", requestedUsername).
				Int("actualLength", len(requestedUsername)).
				Int("maxLength", USERNAME_MAX_LENGTH).
				Msg("requested username is too long")
			return "", ErrUsernameTooLong
		}

		user, _ := u.UB.GetByID(requestedUsername)
		if user != nil {
			log.Warn().Str("userid", requestedUsername).Msg("requested username is already taken")
			return "", ErrUsernameNotAvailable
		}

		id = requestedUsername
	} else {
		id = u.generateNewId()
	}
	log.Info().Str("userid", requestedUsername).Msg("registering new user")

	u.UB.Create(&FMDUser{UID: id, Salt: salt, HashedPassword: hashedPassword, PrivateKey: privKey, PublicKey: pubKey})
	return id, nil
}

func (u *UserRepository) UpdateUserPassword(user *FMDUser, privKey string, salt string, hashedPassword string) {
	log.Info().Str("userid", user.UID).Msg("changing password for user")

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
	log.Info().Str("userid", user.UID).Msg("deleting user")

	u.UB.Delete(&user)
}

func (u *UserRepository) GetLocation(user *FMDUser, idx int) string {
	u.UB.PreloadLocations(user)

	if idx < 0 || idx >= len(user.Locations) {
		log.Warn().
			Int("idx", idx).
			Int("max", len(user.Locations)-1).
			Msg("requested location is out of bounds")
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
	log.Info().Str("userid", user.UID).Msg("changing private key for user")
	user.PrivateKey = key
	u.UB.Save(&user)
}

func (u *UserRepository) GetPublicKey(user *FMDUser) string {
	return user.PublicKey
}

func (u *UserRepository) SetPublicKey(user *FMDUser, key string) {
	log.Info().Str("userid", user.UID).Msg("changing public key for user")
	user.PublicKey = key
	u.UB.Save(&user)
}

/*
func (u *UserRepository) addCommandLogEntry(user *FMDUser, entry string) {
	timestamp := time.Now().Unix()

	logEntry := CommandLogEntryContent{Timestamp: timestamp, Log: entry}
	jsonLog, _ := json.Marshal(logEntry)

	logEntryEncrypted := utils.RsaEncrypt(user.PublicKey, jsonLog)
	comLogEntry := CommandLogEntry{UserID: user.Id, Content: logEntryEncrypted}

	u.UB.Create(&comLogEntry)
}
*/

func (u *UserRepository) SetCommandToUser(user *FMDUser, cmd string, cmdTime uint64, cmdSig string) {
	user.CommandToUser = cmd
	user.CommandTime = cmdTime
	user.CommandSig = cmdSig

	if cmd != "" {
		//logEntry := fmt.Sprintf("Command \"%s\" sent to server!", cmd)
		//u.addCommandLogEntry(user, logEntry)

		u.pushUser(user)
	}
	u.UB.Save(&user)
}

func (u *UserRepository) GetCommandToUser(user *FMDUser) (string, uint64, string) {
	// if user.CommandToUser != "" {
	// 	logEntry := fmt.Sprintf("Command \"%s\" received by device!", user.CommandToUser)
	// 	u.addCommandLogEntry(user, logEntry)
	// }
	return user.CommandToUser, user.CommandTime, user.CommandSig
}

/*
func (u *UserRepository) GetCommandLog(user *FMDUser) string {
	commandLog := ""
	for _, logEntry := range user.CommandLogs {
		commandLog += logEntry.Content + "\n"
	}
	return commandLog
}
*/

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

func (u *UserRepository) RequestAccess(id string, hashedPW string, sessionDurationSeconds uint64, remoteIp string) (*AccessToken, error) {
	log.Debug().Msg("new login attempt")

	user, err := u.UB.GetByID(id)
	if err != nil {
		return nil, err
	}

	if u.ACC.IsLocked(id) {
		log.Warn().
			Str("userid", user.UID).
			Str("remoteIp", remoteIp).
			Msg("blocked login attempt")

		// Cannot sign since the server sets this.
		// This is the only "command" that is allowed to be unsigned.
		u.SetCommandToUser(user, "423", 0, "")
		return nil, ErrAccountLocked
	}

	if strings.EqualFold(strings.ToLower(user.HashedPassword), strings.ToLower(hashedPW)) {
		u.ACC.ResetLock(id)
		token := u.ACC.CreateNewAccessToken(id, sessionDurationSeconds)
		return &token, nil
	} else {
		u.ACC.IncrementLock(id)
		log.Warn().
			Str("userid", user.UID).
			Str("remoteIp", remoteIp).
			Msg("failed login attempt")
		return nil, errors.New("wrong password")
	}
}

func (u *UserRepository) pushUser(user *FMDUser) {
	pushUrl := strings.Replace(u.GetPushUrl(user), "/UP?", "/message?", -1)

	if len(pushUrl) == 0 {
		log.Warn().Str("userid", user.UID).Msg("cannot push user, no push URL, they need to install a UnifiedPush distributor app")
		return
	}

	// Hack: not a real encrypted WebPush request, but made to look like one.
	// Should work, since we use push only as a wake-up mechanism, not for sending any real data.
	// Keep the JSON data (instead of an AES ciphertext) to keep ntfy happy.
	// Long term, we may want to implement proper encrypted WebPush.
	//
	// https://codeberg.org/UnifiedPush/specifications/pulls/1#issuecomment-2281675
	// https://codeberg.org/UnifiedPush/common-proxies/src/commit/200caa145b/gateway/generic.go
	// https://datatracker.ietf.org/doc/html/rfc8030
	// https://datatracker.ietf.org/doc/html/rfc8291
	var jsonData = []byte(`{
		"message": "fmd app wakeup",
		"priority": 5
	}`)
	request, err := http.NewRequest("POST", pushUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		log.Error().Err(err).Str("userid", user.UID).Msg("failed to build push request")
		return
	}
	request.Header.Set("Content-Encoding", "aes128gcm")
	request.Header.Set("TTL", "86400") // cache for one day max
	request.Header.Set("Urgency", "high")

	client := &http.Client{}
	_, err = client.Do(request)
	if err != nil {
		log.Error().Err(err).Str("userid", user.UID).Msg("failed to send push to user")
		return
	}
}
