package user

import (
	"errors"
	"time"
)

type AccessController struct {
	accessTokens []AccessToken
	lockedIDs    []LockedId
}

type AccessToken struct {
	DeviceId       string
	Token          string
	CreationTime   int64
	ExpirationTime int64
}

type LockedId struct {
	DeviceId  string
	Failed    int
	Timestamp int64
}

// A login attempt by the webclient with the wrong password generates 2 requests.
// One with the modern hash, and a second with the legacy hash.
// So to allow 3 attempts we need to allow 3 * 2 requests.
const MAX_ALLOWED_ATTEMPTS = 3 * 2

const DURATION_LOCKED_SECS = 10 * 60          // 10 mins
const DEFAULT_TOKEN_VALID_SECS = 15 * 60      // 15 mins
const MAX_TOKEN_VALID_SECS = 7 * 24 * 60 * 60 // 1 week

func (a *AccessController) IncrementLock(id string) {
	for index, lId := range a.lockedIDs {
		if lId.DeviceId == id {
			if lId.Timestamp < time.Now().Unix() {
				a.lockedIDs[index].Failed = 1
				a.lockedIDs[index].Timestamp = time.Now().Unix() + DURATION_LOCKED_SECS
			} else {
				a.lockedIDs[index].Failed++
				a.lockedIDs[index].Timestamp = time.Now().Unix() + DURATION_LOCKED_SECS
			}
			return
		}
	}
	lId := LockedId{DeviceId: id, Timestamp: time.Now().Unix() + DURATION_LOCKED_SECS, Failed: 1}
	a.lockedIDs = append(a.lockedIDs, lId)
}

func (a *AccessController) IsLocked(idToCheck string) bool {
	for index, lId := range a.lockedIDs {
		if lId.DeviceId == idToCheck {
			if lId.Failed > MAX_ALLOWED_ATTEMPTS {
				if lId.Timestamp < time.Now().Unix() {
					a.lockedIDs[index] = a.lockedIDs[len(a.lockedIDs)-1]
					a.lockedIDs = a.lockedIDs[:len(a.lockedIDs)-1]
					return false
				} else {
					return true
				}
			} else {
				return false
			}
		}
	}
	return false
}

func (a *AccessController) ResetLock(id string) {
	for index, lId := range a.lockedIDs {
		if lId.DeviceId == id {
			a.lockedIDs[index].Failed = 0
			return
		}
	}
}

func (a *AccessController) CheckAccessToken(tokenToCheck string) (string, error) {
	for index, id := range a.accessTokens {
		if id.Token == tokenToCheck {
			tokenExpired := id.ExpirationTime < time.Now().Unix()
			if tokenExpired {
				a.accessTokens[index] = a.accessTokens[len(a.accessTokens)-1]
				a.accessTokens = a.accessTokens[:len(a.accessTokens)-1]
				return "", errors.New("token expired")
			} else {
				return id.DeviceId, nil
			}
		}
	}
	return "", errors.New("token not found")
}

func (a *AccessController) tokenAlreadyExists(toCheck string) bool {
	for _, id := range a.accessTokens {
		if id.Token == toCheck {
			return true
		}
	}
	return false
}

func (a *AccessController) generateNewAccessToken() string {
	newId := genRandomString(20)
	for a.tokenAlreadyExists(newId) {
		newId = genRandomString(20)
	}
	return newId
}

func (a *AccessController) CreateNewAccessToken(id string, sessionDurationSeconds uint64) AccessToken {
	if sessionDurationSeconds == 0 {
		sessionDurationSeconds = DEFAULT_TOKEN_VALID_SECS
	} else if sessionDurationSeconds > MAX_TOKEN_VALID_SECS {
		sessionDurationSeconds = MAX_TOKEN_VALID_SECS
	}

	now := time.Now().Unix()
	token := AccessToken{
		DeviceId:       id,
		Token:          a.generateNewAccessToken(),
		CreationTime:   now,
		ExpirationTime: now + int64(sessionDurationSeconds),
	}
	a.accessTokens = append(a.accessTokens, token)
	return token
}
