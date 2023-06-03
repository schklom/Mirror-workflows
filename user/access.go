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

func (a *AccessController) IncrementLock(id string) {
	for index, lId := range a.lockedIDs {
		if lId.DeviceId == id {
			if lId.Timestamp < time.Now().Unix() {
				a.lockedIDs[index].Failed = 1
				a.lockedIDs[index].Timestamp = time.Now().Unix() + (10 * 60)
			} else {
				a.lockedIDs[index].Failed++
				a.lockedIDs[index].Timestamp = time.Now().Unix() + (10 * 60)
			}
			return
		}
	}
	lId := LockedId{DeviceId: id, Timestamp: time.Now().Unix() + (10 * 60), Failed: 1}
	a.lockedIDs = append(a.lockedIDs, lId)
}

func (a *AccessController) IsLocked(idToCheck string) bool {
	for index, lId := range a.lockedIDs {
		if lId.DeviceId == idToCheck {
			if lId.Failed >= 3 {
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

func (a *AccessController) CheckAccessToken(toCheck string) string {
	for index, id := range a.accessTokens {
		if id.Token == toCheck {
			expirationTime := id.CreationTime + (15 * 60)
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

func (a *AccessController) generateNewAT() string {
	newId := genRandomString(20)
	for a.CheckForDuplicates(newId) {
		newId = genRandomString(20)
	}
	return newId
}

func (a *AccessController) PutAccess(id string) AccessToken {
	newAccess := AccessToken{DeviceId: id, Token: a.generateNewAT(), CreationTime: time.Now().Unix()}
	a.accessTokens = append(a.accessTokens, newAccess)
	return newAccess
}
