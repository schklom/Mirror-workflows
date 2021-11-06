package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"strings"
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
	ids          []string
	dataPath     string
	userIDLength int
	maxSavedLoc  int
	ACC          AccessController
}

type UserInfo struct {
	HashedPassword string
	CommandToUser  string
	Push           string
}

func (u *UserIO) Init(path string, userIDLength int, maxSavedLoc int) {
	u.dataPath = filepath.Join(path, dataDir)
	os.MkdirAll(u.dataPath, os.ModePerm)
	dirs, _ := ioutil.ReadDir(u.dataPath)
	for i := 0; i < len(dirs); i++ {
		u.ids = append(u.ids, dirs[i].Name())
	}
	u.userIDLength = userIDLength
	u.maxSavedLoc = maxSavedLoc
}

func (u *UserIO) CreateNewUser(privKey string, pubKey string, hashedPassword string) string {
	id := u.generateNewId()
	u.ids = append(u.ids, id)

	userPath := filepath.Join(u.dataPath, id)
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
	difference := (highest - smallest) - u.maxSavedLoc
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

func (u *UserIO) GetLocation(id string, pos int) ([]byte, error) {
	userLocationPath := filepath.Join(u.getUserDir(id), locationDir)
	var userLocationFilePath string
	if pos == -1 {
		files, _ := ioutil.ReadDir(userLocationPath)
		highest := 0
		position := -1
		for i := 0; i < len(files); i++ {
			number, _ := strconv.Atoi(files[i].Name())
			if number > highest {
				highest = number
				position = i
			}
		}
		userLocationFilePath = filepath.Join(userLocationPath, files[position].Name())
	} else {
		userLocationFilePath = filepath.Join(userLocationPath, fmt.Sprint(pos))
	}
	return ioutil.ReadFile(userLocationFilePath)
}

func (u *UserIO) GetLocationSize(id string) (int, int) {
	userLocationPath := filepath.Join(u.getUserDir(id), locationDir)
	files, _ := ioutil.ReadDir(userLocationPath)
	highest := -1
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
	return highest, smallest
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
	return filepath.Join(u.dataPath, id)
}

func (u *UserIO) generateNewId() string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	s := make([]rune, u.userIDLength)
	rand.Seed(time.Now().Unix())
	for i := range s {
		s[i] = letters[rand.Intn(len(letters))]
	}
	newId := string(s)
	for i := 0; i < len(u.ids); i++ {
		if u.ids[i] == newId {
			newId = u.generateNewId()
		}
	}
	return newId
}

func (u *UserIO) RequestAccess(id string, hashedPW string) (bool, AccessToken) {
	uInfo, _ := u.GetUserInfo(id)
	if strings.EqualFold(uInfo.HashedPassword, hashedPW) {
		return true, u.ACC.PutAccess(id, u.generateNewId())
	}
	var a AccessToken
	return false, a
}
