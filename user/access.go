package user

import "time"

type AccessController struct {
	accessTokens []AccessToken
	lockedIDs    []LockedId
}

type AccessToken struct {
	DeviceId     string
	Token        string
	CreationTime int64
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

const DURATION_LOCKED_MINS = 10 * 60
const DURATION_TOKEN_VALID_MINS = 15 * 60

func (a *AccessController) IncrementLock(id string) {
	for index, lId := range a.lockedIDs {
		if lId.DeviceId == id {
			if lId.Timestamp < time.Now().Unix() {
				a.lockedIDs[index].Failed = 1
				a.lockedIDs[index].Timestamp = time.Now().Unix() + DURATION_LOCKED_MINS
			} else {
				a.lockedIDs[index].Failed++
				a.lockedIDs[index].Timestamp = time.Now().Unix() + DURATION_LOCKED_MINS
			}
			return
		}
	}
	lId := LockedId{DeviceId: id, Timestamp: time.Now().Unix() + DURATION_LOCKED_MINS, Failed: 1}
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

func (a *AccessController) CheckAccessToken(toCheck string) string {
	for index, id := range a.accessTokens {
		if id.Token == toCheck {
			expirationTime := id.CreationTime + DURATION_TOKEN_VALID_MINS
			tokenExpired := expirationTime < time.Now().Unix()
			if tokenExpired {
				a.accessTokens[index] = a.accessTokens[len(a.accessTokens)-1]
				a.accessTokens = a.accessTokens[:len(a.accessTokens)-1]
				return ""
			} else {
				return id.DeviceId
			}
		}
	}
	return ""
}

func (a *AccessController) CheckForDuplicates(toCheck string) bool {
	for _, id := range a.accessTokens {
		if id.Token == toCheck {
			return true
		}
	}
	return false
}

func (a *AccessController) generateNewAccessToken() string {
	newId := genRandomString(20)
	for a.CheckForDuplicates(newId) {
		newId = genRandomString(20)
	}
	return newId
}

func (a *AccessController) PutAccess(id string) AccessToken {
	newAccess := AccessToken{DeviceId: id, Token: a.generateNewAccessToken(), CreationTime: time.Now().Unix()}
	a.accessTokens = append(a.accessTokens, newAccess)
	return newAccess
}
