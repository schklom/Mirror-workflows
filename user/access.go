package user

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmd-server/metrics"
	"time"
)

type AccessController struct {
	// map token values to token structs
	// This is because a given username can have multiple active sessions
	// in parallel, for example, Android and web.
	accessTokens map[string]AccessToken

	// map usernames to locks
	lockedUsers map[string]LockedUser
}

type AccessToken struct {
	Username       string
	Token          string
	CreationTime   int64
	ExpirationTime int64
}

type LockedUser struct {
	FailedCount    int
	ExpirationTime int64
}

const MAX_ALLOWED_ATTEMPTS = 7

const DURATION_LOCKED_SECS = 10 * 60          // 10 mins
const DEFAULT_TOKEN_VALID_SECS = 15 * 60      // 15 mins
const MAX_TOKEN_VALID_SECS = 7 * 24 * 60 * 60 // 1 week

func NewAccessController() AccessController {
	controller := AccessController{
		accessTokens: make(map[string]AccessToken),
		lockedUsers:  make(map[string]LockedUser),
	}
	go controller.cronRemoveExpired()
	return controller
}

func (a *AccessController) IncrementLock(username string) {
	now := time.Now().Unix()
	lockedUser, exists := a.lockedUsers[username]

	if exists {
		if lockedUser.ExpirationTime < now {
			// lock expired, start new
			lockedUser.FailedCount = 1
		} else {
			lockedUser.FailedCount++
		}
	} else {
		lockedUser = LockedUser{
			FailedCount: 1,
		}
	}
	// Extend lock time
	lockedUser.ExpirationTime = now + DURATION_LOCKED_SECS

	a.lockedUsers[username] = lockedUser

	// It is fiddly to distinguish between "locked accounts" (attemps >= 5)
	// and "accounts with failed login attempts".
	// Thus the metrics simply expose the latter.
	metrics.FailedLoginAccounts.Set(float64(len(a.lockedUsers)))
}

func (a *AccessController) ResetLock(username string) {
	delete(a.lockedUsers, username)
	metrics.FailedLoginAccounts.Set(float64(len(a.lockedUsers)))
}

func (a *AccessController) IsLocked(username string) bool {
	locked, exists := a.lockedUsers[username]

	if !exists {
		return false
	}

	if locked.FailedCount < MAX_ALLOWED_ATTEMPTS {
		return false
	}

	lockExpired := locked.ExpirationTime < time.Now().Unix()
	if lockExpired {
		delete(a.lockedUsers, username)
		metrics.FailedLoginAccounts.Set(float64(len(a.lockedUsers)))
		return false
	}

	return true
}

func (a *AccessController) CheckAccessToken(tokenToCheck string) (string, error) {
	tk, exists := a.accessTokens[tokenToCheck]

	if !exists {
		return "", errors.New("token not found")
	}

	tokenExpired := tk.ExpirationTime < time.Now().Unix()
	if tokenExpired {
		delete(a.accessTokens, tokenToCheck)
		metrics.ActiveSessions.Set(float64(len(a.accessTokens)))
		return "", errors.New("token expired")
	}

	return tk.Username, nil
}

func (a *AccessController) CreateNewAccessToken(username string, sessionDurationSeconds uint64) AccessToken {
	if sessionDurationSeconds == 0 {
		sessionDurationSeconds = DEFAULT_TOKEN_VALID_SECS
	} else if sessionDurationSeconds > MAX_TOKEN_VALID_SECS {
		sessionDurationSeconds = MAX_TOKEN_VALID_SECS
	}

	tokenValue := generateToken(32) // 256 bits
	now := time.Now().Unix()

	token := AccessToken{
		Username:       username,
		Token:          tokenValue,
		CreationTime:   now,
		ExpirationTime: now + int64(sessionDurationSeconds),
	}

	a.accessTokens[tokenValue] = token
	metrics.ActiveSessions.Set(float64(len(a.accessTokens)))
	return token
}

func generateToken(numBytes int) string {
	b := make([]byte, numBytes)
	rand.Read(b) // "it never returns an error"
	return hex.EncodeToString(b)
}

// Remove expired tokens and locks from the controller.
func (a *AccessController) cronRemoveExpired() {
	for range time.Tick(15 * time.Minute) {
		now := time.Now().Unix()

		// Remove expired access tokens
		// Note the deleting elements while iterating over the map is safe:
		// https://stackoverflow.com/a/23230406/11076036
		for key, value := range a.accessTokens {
			if value.ExpirationTime < now {
				delete(a.accessTokens, key)
			}
		}

		// Remove expired locks
		for key, value := range a.lockedUsers {
			if value.ExpirationTime < now {
				delete(a.lockedUsers, key)
			}
		}

		metrics.ActiveSessions.Set(float64(len(a.accessTokens)))
		metrics.FailedLoginAccounts.Set(float64(len(a.lockedUsers)))
	}
}

func (a *AccessController) ResetTokensForUser(username string) {
	// XXX: This is not very efficient
	for key, value := range a.accessTokens {
		if value.Username == username {
			delete(a.accessTokens, key)
		}
	}

	metrics.ActiveSessions.Set(float64(len(a.accessTokens)))
}
