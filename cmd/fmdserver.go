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

const VERSION = "v0.6.0"
const WEB_DIR = "web"

// Server Config
const CONFIG_FILE = "config.yml"

var isIdValid = regexp.MustCompile(`^[a-zA-Z0-9]*$`).MatchString

var uio user.UserRepository

type config struct {
	PortSecure        int    `yaml:"PortSecure"`
	PortInsecure      int    `yaml:"PortInsecure"`
	UserIdLength      int    `yaml:"UserIdLength"`
	MaxSavedLoc       int    `yaml:"MaxSavedLoc"`
	MaxSavedPic       int    `yaml:"MaxSavedPic"`
	RegistrationToken string `yaml:"RegistrationToken"`
	ServerCrt         string `yaml:"ServerCrt"`
	ServerKey         string `yaml:"ServerKey"`
}

// Deprecated: used only by old clients. Modern clients use the opaque DataPackage.
type locationData struct {
	IDT      string
	Provider string
	Date     uint64
	Bat      string
	Lon      string
	Lat      string
}

type registrationData struct {
	Salt              string
	HashedPassword    string
	PubKey            string
	PrivKey           string
	RegistrationToken string
}

type passwordUpdateData struct {
	IDT            string
	Salt           string
	HashedPassword string
	PrivKey        string
}

// This is historically grown, and was originally a DataPackage
type loginData struct {
	IDT                    string
	PasswordHash           string `json:"Data"`
	SessionDurationSeconds uint64
}

// universal package for string transfer
// IDT = DeviceID or AccessToken
// If both will be send. ID is always IDT
type DataPackage struct {
	IDT  string
	Data string
}

// ------- Location -------

func getLocation(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}
	index, _ := strconv.Atoi(request.Data)
	if index == -1 {
		index = uio.GetLocationSize(user)
	}
	data := uio.GetLocation(user, index)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprint(string(data))))
}

func getAllLocations(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}
	data := uio.GetAllLocations(user)
	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "Failed to export data", http.StatusConflict)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprint(string(jsonData))))
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
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return true
	}

	locationAsString, _ := json.MarshalIndent(request, "", " ")
	uio.AddLocation(user, string(locationAsString))
	return true
}

func postLocationLegacy(w http.ResponseWriter, body []byte) bool {
	var location locationData
	err := json.Unmarshal(body, &location)
	if err != nil {
		fmt.Println("Failed to decode as locationData:", err)
		return false
	}
	user, err := uio.CheckAccessTokenAndGetUser(location.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return true
	}

	locationAsString, _ := json.MarshalIndent(location, "", " ")
	uio.AddLocation(user, string(locationAsString))
	return true
}

func getLocationDataSize(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	size := uio.GetLocationSize(user)

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
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	index, _ := strconv.Atoi(request.Data)
	if index == -1 {
		index = uio.GetPictureSize(user)
	}
	data := uio.GetPicture(user, index)
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte(fmt.Sprint(string(data))))
}

func getAllPictures(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}
	data := uio.GetAllPictures(user)
	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "Failed to export data", http.StatusConflict)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprint(string(jsonData))))
}

func getPictureSize(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	highest := uio.GetPictureSize(user)

	dataSize := DataPackage{Data: strconv.Itoa(highest)}
	result, _ := json.Marshal(dataSize)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func postPicture(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	picture := data.Data
	uio.AddPicture(user, picture)
	w.WriteHeader(http.StatusOK)
}

// ------- Public/Private Keys -------

func getPrivKey(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	dataReply := DataPackage{IDT: request.IDT, Data: uio.GetPrivateKey(user)}
	result, _ := json.Marshal(dataReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func getPubKey(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	dataReply := DataPackage{IDT: request.IDT, Data: uio.GetPublicKey(user)}
	result, _ := json.Marshal(dataReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

// ------- Commands -------

func getCommand(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}
	commandAsString := uio.GetCommandToUser(user)

	// commandAsString may be an empty string, that's fine
	reply := DataPackage{IDT: data.IDT, Data: commandAsString}
	result, _ := json.Marshal(reply)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(result))

	// Clear the command so that the app only GETs it once
	uio.SetCommandToUser(user, "")
}

func postCommand(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}
	uio.SetCommandToUser(user, data.Data)
	w.WriteHeader(http.StatusOK)
	pushUser(user)
}

func getCommandLog(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	commandLog := uio.GetCommandLog(user)

	// commandLogs may be empty, that's fine
	reply := DataPackage{IDT: data.IDT, Data: commandLog}
	result, _ := json.Marshal(reply)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(result))
}

// ------- Push -------

func pushUser(user *user.FMDUser) {
	pushUrl := strings.Replace(uio.GetPushUrl(user), "/UP?", "/message?", -1)

	if len(pushUrl) == 0 {
		fmt.Printf("Cannot push user %s. Reason: pushUrl is empty. They should install a UnifiedPush distributor on their phone.", user.UID)
		return
	}

	var jsonData = []byte(`{
		"message": "fmd app wakeup",
		"priority": 5
	}`)
	request, err := http.NewRequest("POST", pushUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("Error building push request:", err)
		return
	}
	request.Header.Set("Content-Type", "application/json; charset=UTF-8")

	client := &http.Client{}
	_, err = client.Do(request)
	if err != nil {
		fmt.Println("Error sending push: ", err)
		return
	}
}

func getPushUrl(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - getIsPushRegistered 1", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	url := uio.GetPushUrl(user)
	w.Write([]byte(fmt.Sprint(url)))
}

func postPushUrl(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	uio.SetPushUrl(user, data.Data)
	w.WriteHeader(http.StatusOK)
}

// ------- Authentication, Login -------

func requestSalt(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if !isIdValid(data.IDT) {
		http.Error(w, "Invalid FMD ID", http.StatusBadRequest)
		return
	}
	salt := uio.GetSalt(data.IDT)
	dataReply := DataPackage{IDT: data.IDT, Data: salt}
	result, _ := json.Marshal(dataReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)

}

func requestAccess(w http.ResponseWriter, r *http.Request) {
	var data loginData
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if !isIdValid(data.IDT) {
		http.Error(w, "Invalid FMD ID", http.StatusBadRequest)
		return
	}

	accessToken, err := uio.RequestAccess(data.IDT, data.PasswordHash, data.SessionDurationSeconds)

	if err == user.ErrAccountLocked {
		http.Error(w, "Account is locked", http.StatusLocked)
		return
	}
	if err != nil {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	accessTokenReply := DataPackage{IDT: data.IDT, Data: accessToken.Token}
	result, _ := json.Marshal(accessTokenReply)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func postPassword(w http.ResponseWriter, r *http.Request) {
	var data passwordUpdateData
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}

	uio.UpdateUserPassword(user, data.PrivKey, data.Salt, data.HashedPassword)

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
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, "Access Token not valid", http.StatusUnauthorized)
		return
	}
	uio.DeleteUser(user)
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
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if h.RegistrationToken != "" && h.RegistrationToken != reg.RegistrationToken {
		fmt.Println("ERROR: invalid RegistrationToken!")
		http.Error(w, "Registration Token not valid", http.StatusUnauthorized)
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
	fmt.Fprint(w, VERSION)
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

func mainPushUrl(w http.ResponseWriter, r *http.Request) {
	// This is inverted, and not nice, but it has grown historically...
	// Ideally the HTTP methods would be GET and PUT (or possibly POST).
	// But the app is using PUT to set the URL, so we need to keep that.
	// And we cannot have a body in GET requests, so we need to use POST.
	switch r.Method {
	case http.MethodPost:
		getPushUrl(w, r)
	case http.MethodPut:
		postPushUrl(w, r)
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

// Adds various security headers.
// Check your deployment with https://securityheaders.com.
func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Xss-Protection", "1; mode=block")
		w.Header().Set("Content-Security-Policy", "default-src 'self' ; img-src 'self' data: https://*.tile.openstreetmap.org ; script-src 'self' 'wasm-unsafe-eval' ; upgrade-insecure-requests")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=()")
		w.Header().Set("Referrer-Policy", "same-origin")

		next.ServeHTTP(w, r)
	})
}

func handleRequests(webDir string, config config) {
	mainDeviceHandler := mainDeviceHandler{createDeviceHandler{config.RegistrationToken}}

	apiV1Mux := http.NewServeMux()
	apiV1Mux.HandleFunc("/command", mainCommand)
	apiV1Mux.HandleFunc("/command/", mainCommand)
	//Disabled Feature: CommandLogs
	//apiV1Mux.HandleFunc("/commandLogs", getCommandLog)
	//apiV1Mux.HandleFunc("/commandLogs/", getCommandLog)
	apiV1Mux.HandleFunc("/location", mainLocation)
	apiV1Mux.HandleFunc("/location/", mainLocation)
	apiV1Mux.HandleFunc("/locations", getAllLocations)
	apiV1Mux.HandleFunc("/locations/", getAllLocations)
	apiV1Mux.HandleFunc("/locationDataSize", getLocationDataSize)
	apiV1Mux.HandleFunc("/locationDataSize/", getLocationDataSize)
	apiV1Mux.HandleFunc("/picture", mainPicture)
	apiV1Mux.HandleFunc("/picture/", mainPicture)
	apiV1Mux.HandleFunc("/pictures", getAllPictures)
	apiV1Mux.HandleFunc("/pictures/", getAllPictures)
	apiV1Mux.HandleFunc("/pictureSize", getPictureSize)
	apiV1Mux.HandleFunc("/pictureSize/", getPictureSize)
	apiV1Mux.HandleFunc("/key", getPrivKey)
	apiV1Mux.HandleFunc("/key/", getPrivKey)
	apiV1Mux.HandleFunc("/pubKey", getPubKey)
	apiV1Mux.HandleFunc("/pubKey/", getPubKey)
	apiV1Mux.Handle("/device", mainDeviceHandler)
	apiV1Mux.Handle("/device/", mainDeviceHandler)
	apiV1Mux.HandleFunc("/password", postPassword)
	apiV1Mux.HandleFunc("/password/", postPassword)
	apiV1Mux.HandleFunc("/push", mainPushUrl)
	apiV1Mux.HandleFunc("/push/", mainPushUrl)
	apiV1Mux.HandleFunc("/salt", requestSalt)
	apiV1Mux.HandleFunc("/salt/", requestSalt)
	apiV1Mux.HandleFunc("/requestAccess", requestAccess)
	apiV1Mux.HandleFunc("/requestAccess/", requestAccess)
	apiV1Mux.HandleFunc("/version", getVersion)
	apiV1Mux.HandleFunc("/version/", getVersion)

	// Uncomment this once the API v1 is no longer hosted at the root "/" (because we cannot have two "/" in muxFinal).
	// Until then, as a side-effect, the static files are also served under /api/v1/.
	// staticFilesMux := http.NewServeMux()
	// staticFilesMux.Handle("/", http.FileServer(http.Dir(webDir)))
	apiV1Mux.Handle("/", http.FileServer(http.Dir(webDir)))

	muxFinal := http.NewServeMux()
	// muxFinal.Handle("/", securityHeadersMiddleware(staticFilesMux))
	muxFinal.Handle("/", securityHeadersMiddleware(apiV1Mux)) // deprecated
	muxFinal.Handle("/api/v1/", http.StripPrefix("/api/v1", securityHeadersMiddleware(apiV1Mux)))

	if fileExists(config.ServerCrt) && fileExists(config.ServerKey) {
		securePort := ":" + strconv.Itoa(config.PortSecure)
		err := http.ListenAndServeTLS(securePort, config.ServerCrt, config.ServerKey, muxFinal)
		if err != nil {
			fmt.Println("HTTPS won't be available.", err)
		}
	}
	insecureAddr := ":" + strconv.Itoa(config.PortInsecure)
	log.Fatal(http.ListenAndServe(insecureAddr, muxFinal))
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
	uio = user.UserRepository{}
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
	if os.IsNotExist(err) || info == nil {
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
	handleRequests(webDir, config)
}
