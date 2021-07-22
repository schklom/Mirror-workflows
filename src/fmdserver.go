package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

//Some IO variables
var version = "v0.2.1"
var dataDir = "data"
var webDir = "web"

//User-Folders
var locationDir = "loc"
var mediaDir = "media"

//User-Files
const privateKeyFile = "privkey"
const publicKeyfile = "pubkey"
const hashedPasswordFile = "hashedPW"
const commandToUserFile = "toDevice"

//Server Config
const serverCert = "server.crt"
const serverKey = "server.key"
const configFile = "config.json"

var filesDir string

var serverConfig config

var ids []string

var accessTokens []AccessToken

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

type commandToDeviceData struct {
	AccessToken string `'json:"AccessToken"`
	Command     string `'json:"Command"`
}

//The json-request from the webpage.
type requestData struct {
	AccessToken string `'json:"AccessToken"`
	Index       int    `'json:"index"`
}

type registrationData struct {
	HashedPassword string `'json:"hashedPassword"`
	PubKey         string `'json:"pubKey"`
	PrivKey        string `'json:"privKey"`
}

type requestAccessData struct {
	HashedPassword string `'json:"HashedPassword"`
	DeviceId       string `'json:"DeviceId"`
}

type AccessToken struct {
	DeviceId    string
	AccessToken string
	Time        int64
}

type AccessTokenReply struct {
	DeviceId    string `'json:"DeviceId"`
	AccessToken string `'json:"AccessToken"`
}

func getLocation(w http.ResponseWriter, r *http.Request) {
	var request requestData
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error - getLocation - 1")
		return
	}
	id := checkAccessToken(request.AccessToken)
	if id == "" {
		fmt.Fprintf(w, "Meeep!, Error - getLocation - 2")
		return
	}
	fmt.Print(request.Index)
	path := filepath.Join(dataDir, id)
	path = filepath.Join(path, locationDir)
	if request.Index == -1 {
		files, _ := ioutil.ReadDir(path)
		highest := 0
		position := -1
		for i := 0; i < len(files); i++ {
			number, _ := strconv.Atoi(files[i].Name())
			if number > highest {
				highest = number
				position = i
			}
		}
		path = filepath.Join(path, files[position].Name())
	} else {
		path = filepath.Join(path, fmt.Sprint(request.Index))
	}
	data, err := ioutil.ReadFile(path)
	if err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(fmt.Sprint(string(data))))
	}
}

func getLocationDataSize(w http.ResponseWriter, r *http.Request) {
	var request requestData
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error - getLocationDataSize - 1")
		return
	}
	id := checkAccessToken(request.AccessToken)
	if id == "" {
		fmt.Fprintf(w, "Meeep!, Error - getLocationDataSize - 1")
		return
	}

	path := filepath.Join(dataDir, id)
	path = filepath.Join(path, locationDir)
	files, _ := ioutil.ReadDir(path)
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
	dataSize := locationDataSize{DataLength: highest, DataBeginningIndex: smallest}
	result, _ := json.Marshal(dataSize)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func getKey(w http.ResponseWriter, r *http.Request) {
	var request requestData
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error - getKey - 1")
		return
	}
	id := checkAccessToken(request.AccessToken)
	if id == "" {
		fmt.Fprintf(w, "Meeep!, Error - getKey - 2")
		return
	}

	filePath := filepath.Join(dataDir, id)
	filePath = filepath.Join(filePath, privateKeyFile)

	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		fmt.Println("File reading error", err)
		return
	}
	w.Header().Set("Content-Type", "application/text")
	w.Write([]byte(fmt.Sprint(string(data))))
}

func putLocation(w http.ResponseWriter, r *http.Request) {
	var location locationData
	err := json.NewDecoder(r.Body).Decode(&location)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error - putLocation - 1")
		return
	}
	id := checkAccessToken(location.AccessToken)
	if id == "" {
		fmt.Fprintf(w, "Meeep!, Error - putLocation - 2")
		return
	}
	path := filepath.Join(dataDir, id)
	path = filepath.Join(path, locationDir)
	files, _ := ioutil.ReadDir(path)
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
	difference := (highest - smallest) - serverConfig.MaxSavedLoc
	if difference > 0 {
		deleteUntil := smallest + difference
		index := smallest
		for index <= deleteUntil {
			indexPath := filepath.Join(path, strconv.Itoa(index))
			os.Remove(indexPath)
			index += 1
		}
	}

	//Create new locationfile
	path = filepath.Join(path, strconv.Itoa(highest))
	file, _ := json.MarshalIndent(location, "", " ")
	_ = ioutil.WriteFile(path, file, 0644)

}

func putCommand(w http.ResponseWriter, r *http.Request) {
	var data commandToDeviceData
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error - putMessage - 1")
		return
	}
	id := checkAccessToken(data.AccessToken)
	if id == "" {
		fmt.Fprintf(w, "Meeep!, Error - putMessage - 2")
		return
	}
	path := filepath.Join(dataDir, id)
	path = filepath.Join(path, commandToUserFile)
	_ = ioutil.WriteFile(path, []byte(data.Command), 0644)
}

func requestAccess(w http.ResponseWriter, r *http.Request) {
	var data requestAccessData
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error - requestAccess - 1")
		return
	}
	if !isIdValid(data.DeviceId) {
		fmt.Fprintf(w, "Meeep!, Error - requestAccess - 2")
		return
	}

	path := filepath.Join(dataDir, data.DeviceId)
	hashedPWPath := filepath.Join(path, hashedPasswordFile)

	hashedPW, err := ioutil.ReadFile(hashedPWPath)
	if err != nil {
		fmt.Println("File reading error", err)
		return
	}
	if strings.EqualFold(string(hashedPW), (data.HashedPassword)) {
		newAccess := AccessToken{DeviceId: data.DeviceId, AccessToken: generateNewId(64), Time: time.Now().Unix()}
		accessTokens = append(accessTokens, newAccess)

		accessToken := AccessToken{DeviceId: data.DeviceId, AccessToken: newAccess.AccessToken}
		result, _ := json.Marshal(accessToken)
		w.Header().Set("Content-Type", "application/json")
		w.Write(result)
	}

}

func createDevice(w http.ResponseWriter, r *http.Request) {
	var device registrationData
	err := json.NewDecoder(r.Body).Decode(&device)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error - createDevice")
		return
	}
	id := generateNewId(serverConfig.IdLength)
	ids = append(ids, id)

	path := filepath.Join(dataDir, id)
	os.MkdirAll(path, os.ModePerm)
	privKeyPath := filepath.Join(path, privateKeyFile)
	_ = ioutil.WriteFile(privKeyPath, []byte(device.PrivKey), 0644)
	pubKeyPath := filepath.Join(path, publicKeyfile)
	_ = ioutil.WriteFile(pubKeyPath, []byte(device.PubKey), 0644)
	hashedPWPath := filepath.Join(path, hashedPasswordFile)
	_ = ioutil.WriteFile(hashedPWPath, []byte(device.HashedPassword), 0644)
	locationPath := filepath.Join(path, locationDir)
	os.MkdirAll(locationPath, os.ModePerm)
	mediaPath := filepath.Join(path, mediaDir)
	os.MkdirAll(mediaPath, os.ModePerm)

	accessToken := AccessToken{DeviceId: id, AccessToken: ""}
	result, _ := json.Marshal(accessToken)
	w.Header().Set("Content-Type", "application/json")
	w.Write(result)
}

func checkAccessToken(idToCheck string) string {
	for index, id := range accessTokens {
		if id.AccessToken == idToCheck {
			expiredTime := id.Time + (15 * 60)
			if expiredTime == 0 {
				accessTokens[index] = accessTokens[len(accessTokens)-1]
				accessTokens = accessTokens[:len(accessTokens)-1]
				return id.DeviceId
			} else if expiredTime < time.Now().Unix() {
				accessTokens[index] = accessTokens[len(accessTokens)-1]
				accessTokens = accessTokens[:len(accessTokens)-1]
				return ""
			} else {
				return id.DeviceId
			}
		}
	}
	return ""
}

func getVersion(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte(fmt.Sprint(version)))
}

func generateNewId(n int) string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	s := make([]rune, n)
	rand.Seed(time.Now().Unix())
	for i := range s {
		s[i] = letters[rand.Intn(len(letters))]
	}
	newId := string(s)
	for i := 0; i < len(ids); i++ {
		if ids[i] == newId {
			newId = generateNewId(n)
		}
	}
	return newId
}

func handleRequests() {
	http.Handle("/", http.FileServer(http.Dir(webDir)))
	http.HandleFunc("/location", getLocation)
	http.HandleFunc("/locationDataSize", getLocationDataSize)
	http.HandleFunc("/key", getKey)
	http.HandleFunc("/newlocation", putLocation)
	http.HandleFunc("/newCommand", putCommand)
	http.HandleFunc("/newDevice", createDevice)
	http.HandleFunc("/requestAccess", requestAccess)
	http.HandleFunc("/version", getVersion)
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
	dataDir = filepath.Join(filesDir, dataDir)
	webDir = filepath.Join(filesDir, webDir)

	fmt.Println("Init: FMD-Datadirectory: ", filesDir)

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
	filePath := filepath.Join(dataDir)
	dirs, _ := ioutil.ReadDir(filePath)
	for i := 0; i < len(dirs); i++ {
		ids = append(ids, dirs[i].Name())
	}
	fmt.Printf("Init: %d Devices registered.\n\n", len(ids))

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
