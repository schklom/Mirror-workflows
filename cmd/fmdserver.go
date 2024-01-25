package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"findmydeviceserver/user"

	"gopkg.in/yaml.v3"
)

// Some IO variables
var VERSION = "v0.5.0"
var WEB_DIR = "web"
var uio user.UserIO

// Server Config
const SERVER_CERT = "server.crt"
const SERVER_KEY = "server.key"
const CONFIG_FILE = "config.yml"

var isIdValid = regexp.MustCompile(`^[a-zA-Z0-9]*$`).MatchString

type config struct {
	PortSecure        int    `yaml:"PortSecure"`
	PortInsecure      int    `yaml:"PortInsecure"`
	UserIdLength      int    `yaml:"UserIdLength"`
	MaxSavedLoc       int    `yaml:"MaxSavedLoc"`
	MaxSavedPic       int    `yaml:"MaxSavedPic"`
	RegistrationToken string `yaml:"RegistrationToken"`
}

// Deprecated: used only by old clients. Modern clients use the opaque DataPackage.
type locationData struct {
	IDT      string `'json:"idt"`
	Provider string `'json:"provider"`
	Date     uint64 `'json:"date"`
	Bat      string `'json:"bat"`
	Lon      string `json:"lon"`
	Lat      string `json:"lat"`
}

type registrationData struct {
	Salt              string `'json:"salt"`
	HashedPassword    string `'json:"hashedPassword"`
	PubKey            string `'json:"pubKey"`
	PrivKey           string `'json:"privKey"`
	RegistrationToken string `'json:"registrationToken"`
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

// ------- Location -------

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
	// Extract the body first. We can only read it once. If we read it twice
	// (e.g. once in postLocationModern and then postLocationLegacy) it will be
	// empty the second time we read it.
	body, err := io.ReadAll(r.Body)
	if err != nil {
		fmt.Println("Failed to read body:", err)
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	// Try the modern method. If it fails fall back to legacy method.
	isModern := postLocationModern(w, body)
	if !isModern {
		postLocationLegacy(w, body)
	}
	w.WriteHeader(http.StatusOK)
}

func postLocationModern(w http.ResponseWriter, body []byte) bool {
	var request DataPackage
	err := json.Unmarshal(body, &request)
	if err != nil {
		// could not decode as DataPackage, try the fallback
		fmt.Println("Failed to decode as DataPackage:", err)
		return false
	}
	if len(request.Data) == 0 {
		// not a valid modern location package
		return false
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - postLocationModern 2", http.StatusBadRequest)
		return true
	}

	locationAsString, _ := json.MarshalIndent(request, "", " ")
	uio.AddLocation(id, string(locationAsString))
	return true
}

func postLocationLegacy(w http.ResponseWriter, body []byte) bool {
	var location locationData
	err := json.Unmarshal(body, &location)
	if err != nil {
		fmt.Println("Failed to decode as locationData:", err)
		return false
	}
	id := uio.ACC.CheckAccessToken(location.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - postLocationLegacy 2", http.StatusBadRequest)
		return true
	}

	locationAsString, _ := json.MarshalIndent(location, "", " ")
	uio.AddLocation(id, string(locationAsString))
	return true
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

	size := uio.GetLocationSize(id)

	dataSize := DataPackage{Data: strconv.Itoa(size)}
	result, _ := json.Marshal(dataSize)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

// ------- Picture -------

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
	w.Header().Set("Content-Type", "text/plain")
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
	w.WriteHeader(http.StatusOK)
}

// ------- Public/Private Keys -------

func getPrivKey(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Meeep!, Error - getPrivKey 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getPrivKey 2", http.StatusBadRequest)
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
		http.Error(w, "Meeep!, Error - getPubKey 1", http.StatusBadRequest)
		return
	}
	id := uio.ACC.CheckAccessToken(request.IDT)
	if id == "" {
		http.Error(w, "Meeep!, Error - getPubKey 2", http.StatusBadRequest)
		return
	}
	dataReply := DataPackage{IDT: request.IDT, Data: uio.GetPublicKey(id)}
	result, _ := json.Marshal(dataReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

// ------- Commands -------

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
	w.WriteHeader(http.StatusOK)
	pushUser(id)
}

func pushUser(id string) {
	pushUrl := strings.Replace(uio.GetPushUrl(id), "/UP?", "/message?", -1)

	var jsonData = []byte(`{
		"message": "fmd app wakeup",
		"priority": 5
	}`)
	request, _ := http.NewRequest("POST", pushUrl, bytes.NewBuffer(jsonData))
	request.Header.Set("Content-Type", "application/json; charset=UTF-8")

	client := &http.Client{}
	_, err := client.Do(request)
	if err != nil {
		fmt.Println("Error sending push: ", err)
		return
	}
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
	w.WriteHeader(http.StatusOK)
}

// ------- Authentication, Login -------

func requestSalt(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - requestSalt 1", http.StatusBadRequest)
		return
	}
	if !isIdValid(data.IDT) {
		http.Error(w, "Meeep!, Error - requestSalt 2", http.StatusBadRequest)
		return
	}
	salt := uio.GetSalt(data.IDT)
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
	if uio.ACC.IsLocked(data.IDT) {
		http.Error(w, "Meeep!, Error - requestAccess 3", http.StatusLocked)
		uio.SetCommandToUser(data.IDT, "423")
		return
	}
	granted, accessToken := uio.RequestAccess(data.IDT, data.Data)
	if granted {
		accessTokenReply := DataPackage{IDT: data.IDT, Data: accessToken.Token}
		result, _ := json.Marshal(accessTokenReply)
		w.Header().Set("Content-Type", "application/json")
		w.Write(result)
	} else {
		uio.ACC.IncrementLock(data.IDT)
		http.Error(w, "Meeep!, Error - requestAccess 4", http.StatusForbidden)
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

// ------- (De-) Registration -------

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
	w.WriteHeader(http.StatusOK)
}

type createDeviceHandler struct {
	RegistrationToken string
}

func (h createDeviceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var reg registrationData
	err := json.NewDecoder(r.Body).Decode(&reg)
	if err != nil {
		fmt.Println("ERROR: decoding json:", err)
		http.Error(w, "Meeep!, Error - createDevice", http.StatusBadRequest)
		return
	}

	if h.RegistrationToken != "" && h.RegistrationToken != reg.RegistrationToken {
		fmt.Println("ERROR: invalid RegistrationToken!")
		http.Error(w, "Meeep!, Error - createDevice", http.StatusUnauthorized)
		return
	}

	id := uio.CreateNewUser(reg.PrivKey, reg.PubKey, reg.Salt, reg.HashedPassword)

	accessToken := user.AccessToken{DeviceId: id, Token: ""}
	result, _ := json.Marshal(accessToken)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

// ------- Main Web Request Handling -------

func getVersion(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte(fmt.Sprint(VERSION)))
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

type mainDeviceHandler struct {
	createDeviceHandler createDeviceHandler
}

func (h mainDeviceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		deleteDevice(w, r)
	case http.MethodPut:
		h.createDeviceHandler.ServeHTTP(w, r)
	}
}

func handleRequests(filesDir string, webDir string, config config) {
	mainDeviceHandler := mainDeviceHandler{createDeviceHandler{config.RegistrationToken}}

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
	http.HandleFunc("/key", getPrivKey)
	http.HandleFunc("/key/", getPrivKey)
	http.HandleFunc("/pubKey", getPubKey)
	http.HandleFunc("/pubKey/", getPubKey)
	http.Handle("/device", mainDeviceHandler)
	http.Handle("/device/", mainDeviceHandler)
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

	if fileExists(filepath.Join(filesDir, SERVER_KEY)) {
		securePort := ":" + strconv.Itoa(config.PortSecure)
		err := http.ListenAndServeTLS(securePort, filepath.Join(filesDir, SERVER_CERT), filepath.Join(filesDir, SERVER_KEY), nil)
		if err != nil {
			fmt.Println("HTTPS won't be available.", err)
		}
	}
	insecureAddr := ":" + strconv.Itoa(config.PortInsecure)
	log.Fatal(http.ListenAndServe(insecureAddr, nil))
}

func load_config(filesDir string) config {
	fmt.Println("Init: Loading Config...")

	configFilePath := filepath.Join(filesDir, CONFIG_FILE)

	configRead := true
	configContent, err := os.ReadFile(configFilePath)
	if err != nil {
		fmt.Println("ERROR: reading config file: ", err)
		configRead = false
	}

	serverConfig := config{}
	err = yaml.Unmarshal(configContent, &serverConfig)
	if err != nil {
		fmt.Println("ERROR: unmarshaling config file: ", err)
		configRead = false
	}

	if !configRead {
		fmt.Println("WARN: No config found! Using defaults.")
		serverConfig = config{PortSecure: 8443, PortInsecure: 8080, UserIdLength: 5, MaxSavedLoc: 1000, MaxSavedPic: 10, RegistrationToken: ""}
	}
	//fmt.Printf("INFO: Using config %+v\n", serverConfig)

	isIdValid = regexp.MustCompile(`^[a-zA-Z0-9]{1,` + strconv.Itoa(serverConfig.UserIdLength) + `}$`).MatchString

	return serverConfig
}

func init_db(filesDir string, config config) {
	fmt.Println("Init: Loading database")
	uio = user.UserIO{}
	uio.Init(filesDir, config.UserIdLength, config.MaxSavedLoc, config.MaxSavedPic)
}

func get_cwd() string {
	executableFile, err := os.Executable()
	if err != nil {
		return "."
	} else {
		dir, _ := filepath.Split(executableFile)
		return dir
	}
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

func main() {
	filesDir := ""
	cwd := get_cwd()
	flag.StringVar(&filesDir, "d", cwd, "Specifiy data directory. Default is the directory of the executable.")
	flag.Parse()
	fmt.Println("Init: FMD-Data directory: ", filesDir)

	webDir := filepath.Join(filesDir, WEB_DIR)
	config := load_config(filesDir)
	init_db(filesDir, config)

	fmt.Println("FMD Server ", VERSION)
	fmt.Println("Starting Server")
	fmt.Printf("Port: %d (insecure) %d (secure)\n", config.PortInsecure, config.PortSecure)
	handleRequests(filesDir, webDir, config)
}
