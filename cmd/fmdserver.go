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

//Some IO variables
var version = "v0.3.2"
var webDir = "web"
var uio user.UserIO

//Server Config
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
}

type locationData struct {
	AccessToken string `'json:"AccessToken"`
	Provider    string `'json:"provider"`
	Date        uint64 `'json:"date"`
	Bat         string `'json:"bat"`
	Lon         string `json:"lon"`
	Lat         string `json:"lat"`
}

type locationDataSize struct {
	AccessToken        string
	DataLength         int
	DataBeginningIndex int
}

type registrationData struct {
	HashedPassword string `'json:"hashedPassword"`
	PubKey         string `'json:"pubKey"`
	PrivKey        string `'json:"privKey"`
}

//universal package for string transfer
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
	data, err := uio.GetLocation(id, index)
	if err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(fmt.Sprint(string(data))))
	}
}

func postLocation(w http.ResponseWriter, r *http.Request) {
	var location locationData
	err := json.NewDecoder(r.Body).Decode(&location)
	if err != nil {
		http.Error(w, "Meeep!, Error - postLocation 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(location.AccessToken)
	if id == "" {
		http.Error(w, "Meeep!, Error - postLocation 2", http.StatusBadRequest)
		return
	}

	locationAsString, _ := json.MarshalIndent(location, "", " ")
	uio.AddLocation(id, string(locationAsString))
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

	highest, smallest := uio.GetLocationSize(id)

	dataSize := locationDataSize{DataLength: highest, DataBeginningIndex: smallest}
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
	w.Header().Set("Content-Type", "application/text")
	w.Write([]byte(fmt.Sprint(uio.GetPrivateKey(id))))
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
	uInfo, _ := uio.GetUserInfo(id)
	if uInfo.CommandToUser != "" {
		commandAsString := string(uInfo.CommandToUser)
		reply := DataPackage{IDT: data.IDT, Data: commandAsString}
		result, _ := json.Marshal(reply)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(result))
		uInfo.CommandToUser = ""
		uio.SetUserInfo(id, uInfo)
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

	uInfo, _ := uio.GetUserInfo(id)
	uInfo.CommandToUser = (data.Data)
	uio.SetUserInfo(id, uInfo)
	url := strings.Replace(uInfo.Push, "/UP?", "/message?", -1)

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

	uInfo, _ := uio.GetUserInfo(id)
	uInfo.Push = (data.Data)
	uio.SetUserInfo(id, uInfo)
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
		uInfo, _ := uio.GetUserInfo(data.IDT)
		uInfo.CommandToUser = "423"
		uio.SetUserInfo(data.IDT, uInfo)
	}

}

func deleteDevice(w http.ResponseWriter, r *http.Request) {
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
	uio.DeleteUser(id)
}

func postDevice(w http.ResponseWriter, r *http.Request) {
	var device registrationData
	err := json.NewDecoder(r.Body).Decode(&device)
	if err != nil {
		http.Error(w, "Meeep!, Error - createDevice", http.StatusBadRequest)
		return
	}
	id := uio.CreateNewUser(device.PrivKey, device.PubKey, device.HashedPassword)

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
	case http.MethodDelete:
		deleteDevice(w, r)
	case http.MethodPost:
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
	http.HandleFunc("/key", getKey)
	http.HandleFunc("/key/", getKey)
	http.HandleFunc("/device", mainDevice)
	http.HandleFunc("/device/", mainDevice)
	http.HandleFunc("/push", postPushLink)
	http.HandleFunc("/push/", postPushLink)
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
		serverConfig = config{PortSecure: 1008, PortUnsecure: 1020, IdLength: 5, MaxSavedLoc: 1000}
		configToString, _ := json.MarshalIndent(serverConfig, "", " ")
		err := ioutil.WriteFile(configFilePath, configToString, 0644)
		fmt.Println(err)
	}
	isIdValid = regexp.MustCompile(`^[a-zA-Z0-9]{1,` + strconv.Itoa(serverConfig.IdLength) + `}$`).MatchString

	fmt.Println("Init: Preparing Devices")
	uio = user.UserIO{}
	uio.Init(filesDir, serverConfig.IdLength, serverConfig.MaxSavedLoc)
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
