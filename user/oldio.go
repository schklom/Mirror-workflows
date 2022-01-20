package user

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

var dataDir = "data"

//User-Folders
var locationDir = "loc"
var mediaDir = "media"

//User-Files
const privateKeyFile = "privkey"
const publicKeyFile = "pubkey"
const userInfoFile = "userdat"

type OLDIO struct {
	Ids          []string
	dataPath     string
	userIDLength int
	maxSavedLoc  int
}

type UserInfo struct {
	HashedPassword string
	CommandToUser  string
	Push           string
}

func (u *OLDIO) Init(path string, userIDLength int, maxSavedLoc int) {
	u.dataPath = filepath.Join(path, dataDir)
	os.MkdirAll(u.dataPath, os.ModePerm)
	dirs, _ := ioutil.ReadDir(u.dataPath)
	for i := 0; i < len(dirs); i++ {
		u.Ids = append(u.Ids, dirs[i].Name())
	}
	u.userIDLength = userIDLength
	u.maxSavedLoc = maxSavedLoc
}

func (u *OLDIO) CreateNewUser(privKey string, pubKey string, hashedPassword string) string {
	id := u.generateNewId()
	u.Ids = append(u.Ids, id)

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

func (u *OLDIO) AddLocation(id string, loc string) {
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

func (u *OLDIO) AddPicture(id string, pic string) {
	userMediaDir := filepath.Join(u.getUserDir(id), mediaDir)
	//Create new locationfile
	userLocationFilePath := filepath.Join(userMediaDir, "picture")
	_ = ioutil.WriteFile(userLocationFilePath, []byte(pic), 0644)
}

func (u *OLDIO) DeleteUser(id string) {
	os.RemoveAll(u.getUserDir(id))
	for i := 0; i < len(u.Ids); i++ {
		if u.Ids[i] == id {
			u.Ids[i] = u.Ids[len(u.Ids)-1]
			u.Ids = u.Ids[:len(u.Ids)-1]
			return
		}
	}

}

func (u *OLDIO) GetLocation(id string, pos int) string {
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
	textBytes, _ := ioutil.ReadFile(userLocationFilePath)
	return string(textBytes)
}

func (u *OLDIO) GetPicture(id string) ([]byte, error) {
	userMediaDir := filepath.Join(u.getUserDir(id), mediaDir)

	files, _ := ioutil.ReadDir(userMediaDir)

	for i := 0; i < len(files); i++ {
		if files[i].Name() == "picture" {
			pictureFile := filepath.Join(userMediaDir, "picture")
			return ioutil.ReadFile(pictureFile)
		}
	}
	return nil, errors.New("no picture available")
}

func (u *OLDIO) GetLocationSize(id string) (int, int) {
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

func (u *OLDIO) GetPrivateKey(id string) string {
	keyFile := filepath.Join(u.getUserDir(id), privateKeyFile)
	keyData, _ := ioutil.ReadFile(keyFile)
	return string(keyData)
}

func (u *OLDIO) GetPublicKey(id string) string {
	keyFile := filepath.Join(u.getUserDir(id), publicKeyFile)
	keyData, _ := ioutil.ReadFile(keyFile)
	return string(keyData)
}

func (u *OLDIO) setPrivateKey(id string, key string) {
	keyFile := filepath.Join(u.getUserDir(id), privateKeyFile)
	ioutil.WriteFile(keyFile, []byte(key), 0644)
}

func (u *OLDIO) setPublicKey(id string, key string) {
	keyFile := filepath.Join(u.getUserDir(id), publicKeyFile)
	ioutil.WriteFile(keyFile, []byte(key), 0644)
}

func (u *OLDIO) SetUserInfo(id string, uInfo UserInfo) {
	userFile := filepath.Join(u.getUserDir(id), userInfoFile)
	userInfoToString, _ := json.MarshalIndent(uInfo, "", " ")
	ioutil.WriteFile(userFile, userInfoToString, 0644)
}

func (u *OLDIO) GetUserInfo(id string) UserInfo {
	userFile := filepath.Join(u.getUserDir(id), userInfoFile)
	userContect, err := ioutil.ReadFile(userFile)
	var uInfo UserInfo
	if err == nil {
		_ = json.Unmarshal(userContect, &uInfo)
	}
	return uInfo
}

func (u *OLDIO) getUserDir(id string) string {
	return filepath.Join(u.dataPath, id)
}

func (u *OLDIO) generateNewId() string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	s := make([]rune, u.userIDLength)
	rand.Seed(time.Now().Unix())
	for i := range s {
		s[i] = letters[rand.Intn(len(letters))]
	}
	newId := string(s)
	for i := 0; i < len(u.Ids); i++ {
		if u.Ids[i] == newId {
			newId = u.generateNewId()
		}
	}
	return newId
}
