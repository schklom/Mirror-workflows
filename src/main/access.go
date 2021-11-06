package main

import "time"

type AccessController struct {
	accessTokens []AccessToken
	lockedIDs    []LockedId
}

type AccessToken struct {
	DeviceId    string
	AccessToken string
	Time        int64
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

func (a *AccessController) isLocked(idToCheck string) bool {
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

func (a *AccessController) CheckAccessToken(idToCheck string) string {
	for index, id := range a.accessTokens {
		if id.AccessToken == idToCheck {
			expiredTime := id.Time + (15 * 60)
			if expiredTime == 0 {
				a.accessTokens[index] = a.accessTokens[len(a.accessTokens)-1]
				a.accessTokens = a.accessTokens[:len(a.accessTokens)-1]
				return id.DeviceId
			} else if expiredTime < time.Now().Unix() {
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

func (a *AccessController) PutAccess(id string, accessTokenId string) AccessToken {
	newAccess := AccessToken{DeviceId: id, AccessToken: accessTokenId, Time: time.Now().Unix()}
	a.accessTokens = append(a.accessTokens, newAccess)
	return newAccess
}
