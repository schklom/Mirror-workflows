package user

import (
	"bytes"
	"encoding/hex"
	"errors"
	"fmd-server/constants"
	"fmd-server/metrics"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
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
	protoVersion uint16,
	encMasterKey string,
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
		Username:           username,
		CryptoProtoVersion: protoVersion,
		EncMasterKeyV2:     encMasterKey,
		PrivateKey:         privKey,
		PublicKey:          pubKey,
	}
	newUser.setPasswordData(innerSalt, innerPwHash)

	u.UB.Create(&newUser)
	metrics.Accounts.Inc()

	return username, nil
}

func (u *UserRepository) UpdateUserPassword(user *FMDUser, privKey string, innerSalt string, innerPwHash string) {
	log.Info().Str("user", user.Username).Msg("changing password for user (v1)")

	user.setPasswordData(innerSalt, innerPwHash)
	// No client should downgrade from protoV2 to ProtoV1. But set it just in case.
	user.CryptoProtoVersion = constants.CryptoProtoV1
	user.PrivateKey = privKey
	u.UB.Save(&user)

	// Security: Revoke all active sessions. This forces them to log in again with the new password.
	u.ACC.ResetTokensForUser(user.Username)
}

func (u *UserRepository) UpdateUserPasswordV2(user *FMDUser, encMasterKey string, innerSalt string, innerPwHash string) {
	log.Info().Str("user", user.Username).Msg("changing password for user (v2)")

	user.setPasswordData(innerSalt, innerPwHash)
	// This function is also called by clients migrating from protoV1 to ProtoV2
	user.CryptoProtoVersion = constants.CryptoProtoV2
	user.EncMasterKeyV2 = encMasterKey
	u.UB.Save(&user)

	// Security: Revoke all active sessions. This forces them to log in again with the new password.
	u.ACC.ResetTokensForUser(user.Username)
}

/* ------- APIv2 Encrypted Data ------- */

// Used by APIv2 for the on-the-wire JSON encoding. Must be defined here to avoid cyclic import.
type EncryptedItemDtoV2 struct {
	ClientItemIdHex  string `json:"clientItemIdHex"`
	UnixMillis       uint64 `json:"unixMillis"`
	CiphertextBase64 string `json:"ciphertext64"`
}

func (u *UserRepository) GetAllDataV2(user *FMDUser, typ string) ([]EncryptedItemDtoV2, error) {
	switch typ {

	case constants.DataTypeCommand:
		u.UB.PreloadCommands(user)
		out := make([]EncryptedItemDtoV2, len(user.CommandsV2))
		for idx, ele := range user.CommandsV2 {
			out[idx] = EncryptedItemDtoV2{
				ClientItemIdHex:  hex.EncodeToString(ele.ClientItemId),
				UnixMillis:       ele.UnixMillis,
				CiphertextBase64: ele.Ciphertext,
			}
		}
		// Note that getting commands in APIv2 does **not** automatically delete them from the database.
		// Clients should explicitly and individually delete commands once they have executed them.
		return out, nil

	case constants.DataTypeLocation:
		u.UB.PreloadLocations(user)
		out := make([]EncryptedItemDtoV2, len(user.LocationsV2))
		for idx, ele := range user.LocationsV2 {
			out[idx] = EncryptedItemDtoV2{
				ClientItemIdHex:  hex.EncodeToString(ele.ClientItemId),
				UnixMillis:       ele.UnixMillis,
				CiphertextBase64: ele.Ciphertext,
			}
		}
		return out, nil

	case constants.DataTypePicture:
		u.UB.PreloadPictures(user)
		out := make([]EncryptedItemDtoV2, len(user.PicturesV2))
		for idx, ele := range user.PicturesV2 {
			out[idx] = EncryptedItemDtoV2{
				ClientItemIdHex:  hex.EncodeToString(ele.ClientItemId),
				UnixMillis:       ele.UnixMillis,
				CiphertextBase64: ele.Ciphertext,
			}
		}
		return out, nil

	default:
		return nil, fmt.Errorf("unknown data type: %s", typ)
	}
}

type metricInterface interface {
	Add(float64)
}

// Generic helper function to add commands/locations/pictures to the database
func addDataInternalV2[T any](
	db *gorm.DB,
	user *FMDUser,
	items []EncryptedItemDtoV2,
	constructRow func(uint64, []byte, uint64, string) T,
	metric metricInterface,
	prune func(*FMDUser),
) error {
	rows := make([]T, 0 /* length */, len(items) /* capacity */)

	for _, it := range items {
		clientItemId, err := hex.DecodeString(it.ClientItemIdHex)
		if err != nil {
			log.Error().Err(err).Str("clientItemIdHex", it.ClientItemIdHex).Msg("failed to hex-decode clientItemId")
			return err
		}
		rows = append(rows, constructRow(user.Id, clientItemId, it.UnixMillis, it.CiphertextBase64))
	}

	res := db.Create(&rows)
	if res.Error != nil {
		return res.Error
	}

	metric.Add(float64(res.RowsAffected))
	prune(user)

	return nil
}

func (u *UserRepository) AddDataV2(user *FMDUser, typ string, items []EncryptedItemDtoV2) error {
	switch typ {

	case constants.DataTypeCommand:
		err := addDataInternalV2(u.UB.DB, user, items,
			func(userId uint64, clientItemId []byte, unixMillis uint64, ciphertext string) CommandV2 {
				return CommandV2{UserId: userId, ClientItemId: clientItemId, UnixMillis: unixMillis, Ciphertext: ciphertext}
			},
			metrics.PendingCommands,
			func(user *FMDUser) {}, // TODO prune commands
		)
		if err == nil {
			u.PushUser(user)
		}
		return err

	case constants.DataTypeLocation:
		return addDataInternalV2(u.UB.DB, user, items,
			func(userId uint64, clientItemId []byte, unixMillis uint64, ciphertext string) LocationV2 {
				return LocationV2{UserId: userId, ClientItemId: clientItemId, UnixMillis: unixMillis, Ciphertext: ciphertext}
			},
			metrics.Locations,
			u.pruneLocations,
		)

	case constants.DataTypePicture:
		return addDataInternalV2(u.UB.DB, user, items,
			func(userId uint64, clientItemId []byte, unixMillis uint64, ciphertext string) PictureV2 {
				return PictureV2{UserId: userId, ClientItemId: clientItemId, UnixMillis: unixMillis, Ciphertext: ciphertext}
			},
			metrics.Pictures,
			u.prunePictures,
		)

	default:
		return fmt.Errorf("unknown data type: %s", typ)
	}
}

func (u *UserRepository) DeleteAllDataV2(user *FMDUser, typ string) error {
	log.Info().Str("user", user.Username).Str("type", typ).Msg("deleting all data")

	switch typ {

	case constants.DataTypeCommand:
		result := u.UB.DB.Where(CommandV2{UserId: user.Id}).Delete(&CommandV2{})
		metrics.PendingCommands.Sub(float64(result.RowsAffected))
		return result.Error

	case constants.DataTypeLocation:
		result := u.UB.DB.Where(LocationV2{UserId: user.Id}).Delete(&LocationV2{})
		metrics.Locations.Sub(float64(result.RowsAffected))
		return result.Error

	case constants.DataTypePicture:
		result := u.UB.DB.Where(PictureV2{UserId: user.Id}).Delete(&PictureV2{})
		metrics.Pictures.Sub(float64(result.RowsAffected))
		return result.Error

	default:
		return fmt.Errorf("unknown data type: %s", typ)
	}
}

func (u *UserRepository) DeleteSingleDatumV2(user *FMDUser, typ string, clientItemIdHex string) error {
	clientItemId, err := hex.DecodeString(clientItemIdHex)
	if err != nil {
		log.Error().Err(err).Str("clientItemIdHex", clientItemIdHex).Msg("failed to hex-decode clientItemId")
		return err
	}

	var result *gorm.DB

	switch typ {

	case constants.DataTypeCommand:
		result = u.UB.DB.Where(CommandV2{UserId: user.Id, ClientItemId: clientItemId}).Delete(&CommandV2{})
		metrics.PendingCommands.Sub(float64(result.RowsAffected))

	case constants.DataTypeLocation:
		result = u.UB.DB.Where(LocationV2{UserId: user.Id, ClientItemId: clientItemId}).Delete(&LocationV2{})
		metrics.Locations.Sub(float64(result.RowsAffected))

	case constants.DataTypePicture:
		result = u.UB.DB.Where(PictureV2{UserId: user.Id, ClientItemId: clientItemId}).Delete(&PictureV2{})
		metrics.Pictures.Sub(float64(result.RowsAffected))

	default:
		return fmt.Errorf("unknown data type: %s", typ)
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return result.Error
}

/* ------- APIv1 Setters ------- */

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

func (u *UserRepository) DeleteAllLocationsV1(user *FMDUser) {
	log.Info().Str("user", user.Username).Msg("deleting all locations")
	result := u.UB.DB.Where(Location{UserID: user.Id}).Delete(&Location{})
	metrics.Locations.Sub(float64(result.RowsAffected))
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

func (u *UserRepository) DeleteAllPicturesV1(user *FMDUser) {
	log.Info().Str("user", user.Username).Msg("deleting all pictures")
	result := u.UB.DB.Where(Picture{UserID: user.Id}).Delete(&Picture{})
	metrics.Pictures.Sub(float64(result.RowsAffected))
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

/* ------- APIv1 Getters ------- */

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

		// Push once for the first login that triggered the lock.
		if u.ACC.IsLocked(username) {
			log.Warn().Str("user", user.Username).Msg("pushing lock notification")
			if user.CryptoProtoVersion == constants.CryptoProtoV1 {
				// Cannot sign since the server sets this.
				// This is the only "command" that is allowed to be unsigned.
				u.SetCommandToUser(user, "423", 0, "")
			} else {
				u.AddMessage(user, CODE_ACCOUNT_LOCKED, "")
			}
		}

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
	request.Header.Set("User-Agent", fmt.Sprintf("fmd-server/%s", constants.VERSION))

	client := &http.Client{Timeout: 10 * time.Second}
	_, err = client.Do(request)
	if err != nil {
		log.Error().Err(err).Str("user", user.Username).Msg("failed to send push to user")
		return
	}
}
