package user

import (
	"bytes"
	"errors"
	"fmd-server/metrics"
	"fmd-server/version"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type UserRepository struct {
	maxSavedLoc int
	maxSavedPic int
	ACC         AccessController
	UB          *FMDDB
}

func NewUserRepository(dbDir string, maxSavedLoc int, maxSavedPic int) UserRepository {
	db := NewFMDDB(dbDir)

	// Initialise all metrics. Later, they are kept up-to-date incrementally.
	initializeUserMetrics(db)

	InitializePushServerMetrics(db)

	return UserRepository{
		maxSavedLoc: maxSavedLoc,
		maxSavedPic: maxSavedPic,
		ACC:         NewAccessController(),
		UB:          db,
	}
}

func (u *UserRepository) CheckAccessTokenAndGetUser(providedAccessToken string) (*FMDUser, error) {
	username, err := u.ACC.CheckAccessToken(providedAccessToken)
	if err != nil {
		return nil, err
	}

	user, err := u.UB.GetByName(username)
	if err != nil {
		return nil, err
	}

	user.LastSeenTime = time.Now().Unix()
	u.UB.Save(&user)

	return user, nil
}

var ErrUsernameInvalid = errors.New("the requested username must be alphanumeric and between 1 and 64 characters")
var ErrUsernameNotAvailable = errors.New("the requested username is not available")

// alphanumeric and - and _
var IsUsernameValid = regexp.MustCompile("^[-_a-zA-Z0-9]{1,64}$").MatchString

func (u *UserRepository) CreateNewUser(
	privKey string,
	pubKey string,
	innerSalt string,
	innerPwHash string,
	requestedUsername string,
) (string, error) {
	if !IsUsernameValid(requestedUsername) {
		log.Warn().Str("username", requestedUsername).Msg("requested username is not alphanumeric between 1 and 64 characters")
		return "", ErrUsernameInvalid
	}

	user, _ := u.UB.GetByName(requestedUsername)
	if user != nil {
		log.Warn().Str("username", requestedUsername).Msg("requested username is already taken")
		return "", ErrUsernameNotAvailable
	}

	username := requestedUsername
	log.Info().Str("username", username).Msg("registering new user")

	newUser := FMDUser{
		Username:   username,
		PrivateKey: privKey,
		PublicKey:  pubKey,
	}
	newUser.setPasswordData(innerSalt, innerPwHash)

	u.UB.Create(&newUser)
	metrics.Accounts.Inc()

	return username, nil
}

func (u *UserRepository) UpdateUserPassword(user *FMDUser, privKey string, innerSalt string, innerPwHash string) {
	log.Info().Str("user", user.Username).Msg("changing password for user")

	user.setPasswordData(innerSalt, innerPwHash)
	user.PrivateKey = privKey
	u.UB.Save(&user)

	// Security: Revoke all active sessions. This forces them to log in again with the new password.
	u.ACC.ResetTokensForUser(user.Username)
}

func (u *UserRepository) AddLocation(user *FMDUser, loc string) {
	u.UB.Create(&Location{Position: loc, UserID: user.Id})
	metrics.Locations.Inc()
	u.pruneLocations(user)
}

func (u *UserRepository) pruneLocations(user *FMDUser) {
	// Preload needed to get the correct latest length
	u.UB.PreloadLocations(user)

	if len(user.Locations) > u.maxSavedLoc {
		locationsToDelete := user.Locations[:(len(user.Locations) - u.maxSavedLoc)]
		for _, locationToDelete := range locationsToDelete {
			u.UB.Delete(&locationToDelete)
			metrics.Locations.Dec()
		}
	}
}

func (u *UserRepository) DeleteAllLocations(user *FMDUser) {
	log.Info().Str("user", user.Username).Msg("deleting all locations")
	rowsDeleted := u.UB.DeleteLocations(user)
	metrics.Locations.Sub(float64(rowsDeleted))
}

func (u *UserRepository) AddPicture(user *FMDUser, pic string) {
	u.UB.Create(&Picture{Content: pic, UserID: user.Id})
	metrics.Pictures.Inc()
	u.prunePictures(user)
}

func (u *UserRepository) prunePictures(user *FMDUser) {
	// Preload needed to get the correct latest length
	u.UB.PreloadPictures(user)

	if len(user.Pictures) > u.maxSavedPic {
		picturesToDelete := user.Pictures[:(len(user.Pictures) - u.maxSavedPic)]
		for _, pictureToDelete := range picturesToDelete {
			u.UB.Delete(&pictureToDelete)
			metrics.Pictures.Dec()
		}
	}
}

func (u *UserRepository) DeleteAllPictures(user *FMDUser) {
	log.Info().Str("user", user.Username).Msg("deleting all pictures")
	rowsDeleted := u.UB.DeletePictures(user)
	metrics.Pictures.Sub(float64(rowsDeleted))
}

func (u *UserRepository) DeleteUser(user *FMDUser) error {
	log.Info().Str("user", user.Username).Msg("deleting user")

	rowsDeleted := u.UB.Delete(&user)
	if rowsDeleted == 0 {
		return errors.New("database error")
	}

	// Reload the metrics by fully re-initializing them.
	// These are simpler DB queries than JOIN-ing tables to find out how many
	// locs/pics were deleted and then decrementing all metrics.
	initializeUserMetrics(u.UB)

	u.ACC.ResetLock(user.Username)
	u.ACC.ResetTokensForUser(user.Username)

	return nil
}

var ErrIndexOutOfBounds = errors.New("requested index is out of bounds")

func (u *UserRepository) GetLocation(user *FMDUser, idx int) (string, error) {
	u.UB.PreloadLocations(user)

	if idx < 0 || idx >= len(user.Locations) {
		log.Warn().
			Int("idx", idx).
			Int("max", len(user.Locations)-1).
			Msg("requested location is out of bounds")
		return "", ErrIndexOutOfBounds
	}
	return user.Locations[idx].Position, nil
}

func (u *UserRepository) GetAllLocations(user *FMDUser) []string {
	u.UB.PreloadLocations(user)

	locations := make([]string, len(user.Locations))
	for i, location := range user.Locations {
		locations[i] = location.Position
	}

	return locations
}

func (u *UserRepository) GetPicture(user *FMDUser, idx int) (string, error) {
	u.UB.PreloadPictures(user)

	if idx < 0 || idx >= len(user.Pictures) {
		log.Warn().
			Int("idx", idx).
			Int("max", len(user.Pictures)-1).
			Msg("requested picture is out of bounds")
		return "", ErrIndexOutOfBounds
	}
	return user.Pictures[idx].Content, nil
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
	log.Info().Str("user", user.Username).Msg("changing private key for user")
	user.PrivateKey = key
	u.UB.Save(&user)
}

func (u *UserRepository) GetPublicKey(user *FMDUser) string {
	return user.PublicKey
}

func (u *UserRepository) SetPublicKey(user *FMDUser, key string) {
	log.Info().Str("user", user.Username).Msg("changing public key for user")
	user.PublicKey = key
	u.UB.Save(&user)
}

func (u *UserRepository) SetCommandToUser(user *FMDUser, cmd string, cmdTime uint64, cmdSig string) {
	if cmd != "" {
		// Only increment if this is not overwriting an existing pending command.
		// TODO: Support delivering more than one command.
		if user.CommandToUser == "" {
			metrics.PendingCommands.Inc()
		}
	}

	user.CommandToUser = cmd
	user.CommandTime = cmdTime
	user.CommandSig = cmdSig

	if cmd != "" {
		u.PushUser(user)
	}

	u.UB.Save(&user)
}

func (u *UserRepository) GetCommandToUser(user *FMDUser) (string, uint64, string) {
	c, t, s := user.CommandToUser, user.CommandTime, user.CommandSig

	if user.CommandToUser != "" {
		metrics.PendingCommands.Dec()
	}

	// Clear the command so that the app only gets it once
	u.SetCommandToUser(user, "", 0, "")

	return c, t, s
}

func (u *UserRepository) SetPushUrl(user *FMDUser, pushUrl string) {
	old := user.PushUrl
	UpdatePushServerMetrics(old, pushUrl)

	user.PushUrl = pushUrl
	u.UB.Save(&user)
}

func (u *UserRepository) GetPushUrl(user *FMDUser) string {
	return user.PushUrl
}

func (u *UserRepository) GetSalt(username string) string {
	user, err := u.UB.GetByName(username)
	if err != nil {
		return ""
	}
	// migrateToV2Passwords should ensure that all users have Salt set
	return user.Salt
}

var ErrNotFound = errors.New("account not found")
var ErrWrongPassword = errors.New("wrong password")
var ErrAccountLocked = errors.New("too many attempts, account locked")

func (u *UserRepository) RequestAccess(username string, innerPwHash string, sessionDurationSeconds uint64, remoteIp string) (*FMDUser, *AccessToken, error) {
	user, err := u.UB.GetByName(username)
	if err != nil {
		return nil, nil, ErrNotFound
	}

	if u.ACC.IsLocked(username) {
		// This log message is used by fail2ban, do NOT change!
		log.Warn().
			Str("user", user.Username).
			Str("remoteIp", remoteIp).
			Msg("blocked login attempt")

		// Cannot sign since the server sets this.
		// This is the only "command" that is allowed to be unsigned.
		u.SetCommandToUser(user, "423", 0, "")
		return nil, nil, ErrAccountLocked
	}

	expected := user.HashedPassword
	actual := hashPasswordForLogin(innerPwHash)

	if actual == expected {
		u.ACC.ResetLock(username)
		token := u.ACC.CreateNewAccessToken(username, sessionDurationSeconds)

		// Push user after login to make sure that they fetch the pending command
		if user.CommandToUser != "" {
			go func() {
				time.Sleep(15 * time.Second)

				// Get the latest user from the DB, since after the login
				// e.g. the pushUrl may have changed.
				user, err := u.UB.GetByName(username)
				if err == nil {
					if user.CommandToUser != "" {
						u.PushUser(user)
					}
				}
			}()
		}

		return user, &token, nil
	} else {
		u.ACC.IncrementLock(username)

		// This log message is used by fail2ban, do NOT change!
		log.Warn().
			Str("user", user.Username).
			Str("remoteIp", remoteIp).
			Msg("failed login attempt")
		return nil, nil, ErrWrongPassword
	}
}

func (u *UserRepository) PushUser(user *FMDUser) {
	pushUrl := strings.Replace(u.GetPushUrl(user), "/UP?", "/message?", -1)

	if len(pushUrl) == 0 {
		log.Warn().Str("user", user.Username).Msg("cannot push user, no push URL, they need to install a UnifiedPush distributor app")
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
		log.Error().Err(err).Str("user", user.Username).Msg("failed to build push request")
		return
	}
	request.Header.Set("Content-Encoding", "aes128gcm")
	request.Header.Set("TTL", "86400") // cache for one day max
	request.Header.Set("Urgency", "high")
	request.Header.Set("User-Agent", fmt.Sprintf("fmd-server/%s", version.VERSION))

	client := &http.Client{Timeout: 10 * time.Second}
	_, err = client.Do(request)
	if err != nil {
		log.Error().Err(err).Str("user", user.Username).Msg("failed to send push to user")
		return
	}
}
