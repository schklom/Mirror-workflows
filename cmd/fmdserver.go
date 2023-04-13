package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"findmydeviceserver/user"
)

// Some IO variables
var version = "v0.3.6"
var webDir = "web"
var uio user.UserIO

// Server Config
const serverCert = "server.crt"
const serverKey = "server.key"
const configFile = "config.json"

var filesDir string

var serverConfig config

var isIdValid = regexp.MustCompile(`^[a-zA-Z0-9]*$`).MatchString

type config struct {
	PortSecure   int
	PortUnsecure int
	IdLength     int
	MaxSavedLoc  int
	MaxSavedPic  int
}

type locationData struct {
	IDT      string `'json:"idt"`
	Provider string `'json:"provider"`
	Date     uint64 `'json:"date"`
	Bat      string `'json:"bat"`
	Lon      string `json:"lon"`
	Lat      string `json:"lat"`
}

type registrationData struct {
	Salt           string `'json:"salt"`
	HashedPassword string `'json:"hashedPassword"`
	PubKey         string `'json:"pubKey"`
	PrivKey        string `'json:"privKey"`
}

type passwordUpdateData struct {
	IDT            string `'json:"idt"`
	Salt           string `'json:"salt"`
	HashedPassword string `'json:"hashedPassword"`
	PrivKey        string `'json:"privKey"`
}

// universal package for string transfer
// IDT = DeviceID or AccessToken
// If both will be send. ID is always IDT
type DataPackage struct {
	IDT  string `'json:"Identifier"`
	Data string `'json:"Data"`
}

func getLocation(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Meeep!, Error - getLocation 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getLocation 2", http.StatusBadRequest)
		return
	}
	index, _ := strconv.Atoi(request.Data)
	if index == -1 {
		index = uio.GetLocationSize(id)
	}
	data := uio.GetLocation(id, index)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprint(string(data))))
}

func postLocation(w http.ResponseWriter, r *http.Request) {
	var location locationData
	err := json.NewDecoder(r.Body).Decode(&location)
	if err != nil {
		http.Error(w, "Meeep!, Error - postLocation 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(location.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - postLocation 2", http.StatusBadRequest)
		return
	}

	locationAsString, _ := json.MarshalIndent(location, "", " ")
	uio.AddLocation(id, string(locationAsString))
}

func getPicture(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Meeep!, Error - getPicture 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getPicture 2", http.StatusBadRequest)
		return
	}
	index, _ := strconv.Atoi(request.Data)
	if index == -1 {
		index = uio.GetPictureSize(id)
	}
	data := uio.GetPicture(id, index)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprint(string(data))))
}

func getPictureSize(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Meeep!, Error - getPictureSize 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getPictureSize 2", http.StatusBadRequest)
		return
	}

	highest := uio.GetPictureSize(id)

	dataSize := DataPackage{Data: strconv.Itoa(highest)}
	result, _ := json.Marshal(dataSize)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func postPicture(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - postPicture 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(data.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - postPicture 2", http.StatusBadRequest)
		return
	}

	picture := data.Data
	uio.AddPicture(id, picture)
}

func getLocationDataSize(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Meeep!, Error - getLocationDataSize 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getLocationDataSize 2", http.StatusBadRequest)
		return
	}

	highest := uio.GetLocationSize(id)

	dataSize := DataPackage{Data: strconv.Itoa(highest)}
	result, _ := json.Marshal(dataSize)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func getKey(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Meeep!, Error - getKey 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getKey 2", http.StatusBadRequest)
		return
	}
	dataReply := DataPackage{IDT: request.IDT, Data: uio.GetPrivateKey(id)}
	result, _ := json.Marshal(dataReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func getPubKey(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Meeep!, Error - getKey 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getKey 2", http.StatusBadRequest)
		return
	}
	dataReply := DataPackage{IDT: request.IDT, Data: uio.GetPublicKey(id)}
	result, _ := json.Marshal(dataReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func getCommand(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - getCommand 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(data.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getCommand 2", http.StatusBadRequest)
		return
	}
	commandAsString := uio.GetCommandToUser(id)
	if commandAsString != "" {
		reply := DataPackage{IDT: data.IDT, Data: commandAsString}
		result, _ := json.Marshal(reply)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(result))
		uio.SetCommandToUser(id, "")
	} else {
		reply := DataPackage{IDT: data.IDT, Data: ""}
		result, _ := json.Marshal(reply)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(result))
	}

}

func postCommand(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - postCommand 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(data.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - postCommand 2", http.StatusBadRequest)
		return
	}
	uio.SetCommandToUser(id, data.Data)

	url := strings.Replace(uio.GetPushUrl(id), "/UP?", "/message?", -1)

	var jsonData = []byte(`{
		"message": "magic may begin",
		"priority": 5
	}`)
	request, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	request.Header.Set("Content-Type", "application/json; charset=UTF-8")

	client := &http.Client{}
	client.Do(request)
}

func postPushLink(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - postCommand 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(data.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - postCommand 2", http.StatusBadRequest)
		return
	}

	uio.SetPushUrl(id, data.Data)
}

func requestSalt(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - requestSalt 1", http.StatusBadRequest)
		return
	}
	var salt string
	if !isIdValid(data.IDT) {
		salt = "cafe"
	} else {
		salt = uio.GetSalt(data.IDT)
	}
	dataReply := DataPackage{IDT: data.IDT, Data: salt}
	result, _ := json.Marshal(dataReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)

}

func requestAccess(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - requestAccess 1", http.StatusBadRequest)
		return
	}
	if !isIdValid(data.IDT) {
		http.Error(w, "Meeep!, Error - requestAccess 2", http.StatusBadRequest)
		return
	}
	if !uio.ACC.IsLocked(data.IDT) {
		checkPassed, accessToken := uio.RequestAccess(data.IDT, data.Data)
		if checkPassed {
			accesstokenReply := DataPackage{IDT: data.IDT, Data: accessToken.AccessToken}
			result, _ := json.Marshal(accesstokenReply)
			w.Header().Set("Content-Type", "application/json")
			w.Write(result)
		} else {
			uio.ACC.IncrementLock(data.IDT)
			http.Error(w, "Meeep!, Error - requestAccess 3", http.StatusForbidden)
		}
	} else {
		http.Error(w, "Meeep!, Error - requestAccess 3", http.StatusLocked)
		uio.SetCommandToUser(data.IDT, "423")
	}

}

func postPassword(w http.ResponseWriter, r *http.Request) {
	var data passwordUpdateData
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - password", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(data.IDT)

	uio.UpdateUserPassword(id, data.PrivKey, data.Salt, data.HashedPassword)

	dataReply := DataPackage{IDT: data.IDT, Data: "true"}
	result, _ := json.Marshal(dataReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func deleteDevice(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - deleteDevice 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(data.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - deleteDevice 2", http.StatusBadRequest)
		return
	}
	uio.DeleteUser(id)
}

func postDevice(w http.ResponseWriter, r *http.Request) {
	var device registrationData
	err := json.NewDecoder(r.Body).Decode(&device)
	if err != nil {
		http.Error(w, "Meeep!, Error - createDevice", http.StatusBadRequest)
		return
	}
	if device.Salt == "" {
		device.Salt = "cafe"
	}
	id := uio.CreateNewUser(device.PrivKey, device.PubKey, device.Salt, device.HashedPassword)

	accessToken := user.AccessToken{DeviceId: id, AccessToken: ""}
	result, _ := json.Marshal(accessToken)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func getVersion(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte(fmt.Sprint(version)))
}

func mainLocation(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPut:
		getLocation(w, r)
	case http.MethodPost:
		postLocation(w, r)
	}
}

func mainPicture(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPut:
		getPicture(w, r)
	case http.MethodPost:
		postPicture(w, r)
	}
}

func mainCommand(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPut:
		getCommand(w, r)
	case http.MethodPost:
		postCommand(w, r)
	}
}

func mainDevice(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		deleteDevice(w, r)
	case http.MethodPut:
		postDevice(w, r)
	}
}

func handleRequests() {
	http.Handle("/", http.FileServer(http.Dir(webDir)))
	http.HandleFunc("/command", mainCommand)
	http.HandleFunc("/command/", mainCommand)
	http.HandleFunc("/location", mainLocation)
	http.HandleFunc("/location/", mainLocation)
	http.HandleFunc("/locationDataSize", getLocationDataSize)
	http.HandleFunc("/locationDataSize/", getLocationDataSize)
	http.HandleFunc("/picture", mainPicture)
	http.HandleFunc("/picture/", mainPicture)
	http.HandleFunc("/pictureSize", getPictureSize)
	http.HandleFunc("/pictureSize/", getPictureSize)
	http.HandleFunc("/key", getKey)
	http.HandleFunc("/key/", getKey)
	http.HandleFunc("/pubKey", getPubKey)
	http.HandleFunc("/pubKey/", getPubKey)
	http.HandleFunc("/device", mainDevice)
	http.HandleFunc("/device/", mainDevice)
	http.HandleFunc("/password", postPassword)
	http.HandleFunc("/password/", postPassword)
	http.HandleFunc("/push", postPushLink)
	http.HandleFunc("/push/", postPushLink)
	http.HandleFunc("/salt", requestSalt)
	http.HandleFunc("/salt/", requestSalt)
	http.HandleFunc("/requestAccess", requestAccess)
	http.HandleFunc("/requestAccess/", requestAccess)
	http.HandleFunc("/version", getVersion)
	http.HandleFunc("/version/", getVersion)
	if fileExists(filepath.Join(filesDir, serverKey)) {
		securePort := ":" + strconv.Itoa(serverConfig.PortSecure)
		err := http.ListenAndServeTLS(securePort, filepath.Join(filesDir, serverCert), filepath.Join(filesDir, serverKey), nil)
		if err != nil {
			fmt.Println("HTTPS won't be available.", err)
		}
	}
	unsecurePort := ":" + strconv.Itoa(serverConfig.PortUnsecure)
	log.Fatal(http.ListenAndServe(unsecurePort, nil))
}

func initServer() {
	if filesDir == "" {
		executableFile, err := os.Executable()
		if err != nil {
			filesDir = "."
		} else {
			dir, _ := filepath.Split(executableFile)
			filesDir = dir
		}
	}
	webDir = filepath.Join(filesDir, webDir)

	fmt.Println("Init: FMD-Data directory: ", filesDir)

	fmt.Println("Init: Preparing FMD-Server...")

	fmt.Println("Init: Preparing Config...")

	configFilePath := filepath.Join(filesDir, configFile)

	configRead := true
	configContent, err := ioutil.ReadFile(configFilePath)
	if err != nil {
		configRead = false
	}
	err = json.Unmarshal(configContent, &serverConfig)
	if err != nil {
		configRead = false
	}
	//Create DefaultConfig when no config available
	if !configRead {
		serverConfig = config{PortSecure: 1008, PortUnsecure: 1020, IdLength: 5, MaxSavedLoc: 1000, MaxSavedPic: 10}
		configToString, _ := json.MarshalIndent(serverConfig, "", " ")
		err := ioutil.WriteFile(configFilePath, configToString, 0644)
		fmt.Println(err)
	}
	isIdValid = regexp.MustCompile(`^[a-zA-Z0-9]{1,` + strconv.Itoa(serverConfig.IdLength) + `}$`).MatchString

	fmt.Println("Init: Preparing Devices")
	uio = user.UserIO{}
	uio.Init(filesDir, serverConfig.IdLength, serverConfig.MaxSavedLoc, serverConfig.MaxSavedPic)
	fmt.Printf("Init: Devices registered\n\n")
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

func main() {
	flag.StringVar(&filesDir, "d", "", "Specifiy data directory. Default is the directory of the executable.")
	flag.Parse()

	initServer()

	fmt.Println("FMD - Server - ", version)
	fmt.Println("Starting Server")
	fmt.Printf("Port: %d(unsecure) %d(secure)\n", serverConfig.PortUnsecure, serverConfig.PortSecure)
	handleRequests()
}
