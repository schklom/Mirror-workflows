package main

import (
	"encoding/json"
	"io/ioutil"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

var dataDir = "dataNew"

//User-Folders
var locationDir = "loc"
var mediaDir = "media"

//User-Files
const privateKeyFile = "privkey"
const publicKeyFile = "pubkey"
const userInfoFile = "userdat"

type UserIO struct {
	IDs          []string
	LockedIDs    []LockedId
	DataPath     string
	UserIDLength int
	MaxSavedLoc  int
}

type UserInfo struct {
	HashedPassword string
	CommandToUser  string
	Push           string
}

type LockedId struct {
	DeviceId  string
	Failed    int
	Timestamp int64
}

func (u *UserIO) Init(path string, userIDLength int, maxSavedLoc int) {
	u.DataPath = filepath.Join(path, dataDir)
	os.MkdirAll(u.DataPath, os.ModePerm)
	dirs, _ := ioutil.ReadDir(u.DataPath)
	for i := 0; i < len(dirs); i++ {
		u.IDs = append(u.IDs, dirs[i].Name())
	}
	u.UserIDLength = userIDLength
	u.MaxSavedLoc = maxSavedLoc
}

func (u *UserIO) CreateNewUser(privKey string, pubKey string, hashedPassword string) string {
	id := u.generateNewId(u.UserIDLength)
	u.IDs = append(u.IDs, id)

	userPath := filepath.Join(u.DataPath, id)
	os.MkdirAll(userPath, os.ModePerm)
	locationPath := filepath.Join(userPath, locationDir)
	os.MkdirAll(locationPath, os.ModePerm)
	mediaPath := filepath.Join(userPath, mediaDir)
	os.MkdirAll(mediaPath, os.ModePerm)
	u.setPrivateKey(id, privKey)
	u.setPublicKey(id, pubKey)

	uInfo := UserInfo{HashedPassword: hashedPassword, CommandToUser: "", Push: ""}
	u.SetUserInfo(id, uInfo)

	return id
}

func (u *UserIO) AddLocation(id string, loc string) {
	userLocationPath := filepath.Join(u.getUserDir(id), locationDir)
	files, _ := ioutil.ReadDir(userLocationPath)
	highest := 0
	smallest := 2147483647
	for i := 0; i < len(files); i++ {
		number, err := strconv.Atoi(files[i].Name())
		if err == nil {
			if number > highest {
				highest = number
			}
			if number < smallest {
				smallest = number
			}
		}
	}
	highest += 1

	//Auto-Clean directory
	difference := (highest - smallest) - u.MaxSavedLoc
	if difference > 0 {
		deleteUntil := smallest + difference
		index := smallest
		for index <= deleteUntil {
			indexPath := filepath.Join(userLocationPath, strconv.Itoa(index))
			os.Remove(indexPath)
			index += 1
		}
	}

	//Create new locationfile
	userLocationFilePath := filepath.Join(userLocationPath, strconv.Itoa(highest))
	_ = ioutil.WriteFile(userLocationFilePath, []byte(loc), 0644)
}

func (u *UserIO) GetLocation(id string, pos int) {

}

func (u *UserIO) GetPrivateKey(id string) (string, error) {
	keyFile := filepath.Join(u.getUserDir(id), privateKeyFile)
	keyData, err := ioutil.ReadFile(keyFile)
	return string(keyData), err
}

func (u *UserIO) setPrivateKey(id string, key string) {
	keyFile := filepath.Join(u.getUserDir(id), privateKeyFile)
	ioutil.WriteFile(keyFile, []byte(key), 0644)
}

func (u *UserIO) setPublicKey(id string, key string) {
	keyFile := filepath.Join(u.getUserDir(id), publicKeyFile)
	ioutil.WriteFile(keyFile, []byte(key), 0644)
}

func (u *UserIO) SetUserInfo(id string, uInfo UserInfo) {
	userFile := filepath.Join(u.getUserDir(id), userInfoFile)
	userInfoToString, _ := json.MarshalIndent(uInfo, "", " ")
	ioutil.WriteFile(userFile, userInfoToString, 0644)
}

func (u *UserIO) GetUserInfo(id string) (UserInfo, error) {
	userFile := filepath.Join(u.getUserDir(id), userInfoFile)
	userContect, err := ioutil.ReadFile(userFile)
	var uInfo UserInfo
	if err == nil {
		err = json.Unmarshal(userContect, &uInfo)
	}
	return uInfo, err
}

func (u *UserIO) getUserDir(id string) string {
	return filepath.Join(u.DataPath, id)
}

func (u *UserIO) generateNewId(n int) string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	s := make([]rune, n)
	rand.Seed(time.Now().Unix())
	for i := range s {
		s[i] = letters[rand.Intn(len(letters))]
	}
	newId := string(s)
	for i := 0; i < len(u.IDs); i++ {
		if u.IDs[i] == newId {
			newId = u.generateNewId(n)
		}
	}
	return newId
}

func (u *UserIO) IncrementLock(id string) {
	for index, lId := range u.LockedIDs {
		if lId.DeviceId == id {
			if lId.Timestamp < time.Now().Unix() {
				u.LockedIDs[index].Failed = 1
				u.LockedIDs[index].Timestamp = time.Now().Unix() + (10 * 60)
			} else {
				u.LockedIDs[index].Failed++
				u.LockedIDs[index].Timestamp = time.Now().Unix() + (10 * 60)
			}
			return
		}
	}
	lId := LockedId{DeviceId: id, Timestamp: time.Now().Unix() + (10 * 60), Failed: 1}
	u.LockedIDs = append(u.LockedIDs, lId)
}

func (u *UserIO) isLocked(idToCheck string) bool {
	for index, lId := range u.LockedIDs {
		if lId.DeviceId == idToCheck {
			if lId.Failed >= 3 {
				if lId.Timestamp < time.Now().Unix() {
					u.LockedIDs[index] = u.LockedIDs[len(u.LockedIDs)-1]
					u.LockedIDs = u.LockedIDs[:len(u.LockedIDs)-1]
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
