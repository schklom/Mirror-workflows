package user

import (
	"errors"
	"fmd-server/metrics"
	"time"
)

type AccessController struct {
	// map token values to token structs
	// This is because a given user id can have multiple active sessions
	// in parallel, for example, Android and web.
	accessTokens map[string]AccessToken

	// map user ids to locks
	lockedIDs map[string]LockedId
}

type AccessToken struct {
	DeviceId       string
	Token          string
	CreationTime   int64
	ExpirationTime int64
}

type LockedId struct {
	FailedCount    int
	ExpirationTime int64
}

const MAX_ALLOWED_ATTEMPTS = 5

const DURATION_LOCKED_SECS = 10 * 60          // 10 mins
const DEFAULT_TOKEN_VALID_SECS = 15 * 60      // 15 mins
const MAX_TOKEN_VALID_SECS = 7 * 24 * 60 * 60 // 1 week

func NewAccessController() AccessController {
	controller := AccessController{
		accessTokens: make(map[string]AccessToken),
		lockedIDs:    make(map[string]LockedId),
	}
	go controller.cronRemoveExpired()
	return controller
}

func (a *AccessController) IncrementLock(userId string) {
	now := time.Now().Unix()
	lId, exists := a.lockedIDs[userId]

	if exists {
		if lId.ExpirationTime < now {
			// lock expired, start new
			lId.FailedCount = 1
		} else {
			lId.FailedCount++
		}
	} else {
		lId = LockedId{
			FailedCount: 1,
		}
	}
	// Extend lock time
	lId.ExpirationTime = now + DURATION_LOCKED_SECS

	a.lockedIDs[userId] = lId

	// It is fiddly to distinguish between "locked accounts" (attemps >= 5)
	// and "accounts with failed login attempts".
	// Thus the metrics simply expose the latter.
	metrics.FailedLoginAccounts.Set(float64(len(a.lockedIDs)))
}

func (a *AccessController) ResetLock(userId string) {
	delete(a.lockedIDs, userId)
	metrics.FailedLoginAccounts.Set(float64(len(a.lockedIDs)))
}

func (a *AccessController) IsLocked(id string) bool {
	lId, exists := a.lockedIDs[id]

	if !exists {
		return false
	}

	if lId.FailedCount <= MAX_ALLOWED_ATTEMPTS {
		return false
	}

	lockExpired := lId.ExpirationTime < time.Now().Unix()
	if lockExpired {
		delete(a.lockedIDs, id)
		metrics.FailedLoginAccounts.Set(float64(len(a.lockedIDs)))
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

	return tk.DeviceId, nil
}

func (a *AccessController) CreateNewAccessToken(id string, sessionDurationSeconds uint64) AccessToken {
	if sessionDurationSeconds == 0 {
		sessionDurationSeconds = DEFAULT_TOKEN_VALID_SECS
	} else if sessionDurationSeconds > MAX_TOKEN_VALID_SECS {
		sessionDurationSeconds = MAX_TOKEN_VALID_SECS
	}

	// long enough to be guaranteed to be unique
	tokenValue := genRandomString(32)
	now := time.Now().Unix()

	token := AccessToken{
		DeviceId:       id,
		Token:          tokenValue,
		CreationTime:   now,
		ExpirationTime: now + int64(sessionDurationSeconds),
	}

	a.accessTokens[tokenValue] = token
	metrics.ActiveSessions.Set(float64(len(a.accessTokens)))
	return token
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
		for key, value := range a.lockedIDs {
			if value.ExpirationTime < now {
				delete(a.lockedIDs, key)
			}
		}

		metrics.ActiveSessions.Set(float64(len(a.accessTokens)))
		metrics.FailedLoginAccounts.Set(float64(len(a.lockedIDs)))
	}
}

func (a *AccessController) ResetTokensForUser(userId string) {
	// XXX: This is not very efficient
	for key, value := range a.accessTokens {
		if value.DeviceId == userId {
			delete(a.accessTokens, key)
		}
	}

	metrics.ActiveSessions.Set(float64(len(a.accessTokens)))
}
