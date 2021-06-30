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
	"time"
)

//Some IO variables
var version = "v0.2"
var dataDir = "data"
var webDir = "web"

const privateKeyFile = "privkey"
const serverCert = "server.crt"
const serverKey = "server.key"
const configFile = "config.json"

var filesDir string

var debug bool

var serverConfig config

var ids []string

var isIdValid = regexp.MustCompile(`^[a-zA-Z0-9]*$`).MatchString

type config struct {
	PortSecure   string
	PortUnsecure string
	IdLength     int
	MaxSavedLoc  int
}

type locationData struct {
	Id       string `'json:"id"`
	Provider string `'json:"provider"`
	Date     uint64 `'json:"date"`
	Bat      string `'json:"bat"`
	Lon      string `json:"lon"`
	Lat      string `json:"lat"`
}

//The json-request from the webpage.
type requestData struct {
	Id    string `'json:"id"`
	Index int    `'json:"index"`
}

func getLocation(w http.ResponseWriter, r *http.Request) {
	var request requestData
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error")
		return
	}
	if !isIdValid(request.Id) {
		fmt.Fprintf(w, "Meeep!, Error")
		return
	}
	fmt.Print(request.Index)
	filePath := filepath.Join(dataDir, request.Id)
	if request.Index == -1 {
		files, _ := ioutil.ReadDir(filePath)
		highest := 0
		position := -1
		for i := 0; i < len(files); i++ {
			number, _ := strconv.Atoi(files[i].Name())
			if number > highest {
				highest = number
				position = i
			}
		}
		filePath = filepath.Join(filePath, files[position].Name())
	} else {
		filePath = filepath.Join(filePath, fmt.Sprint(request.Index))
	}
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		fmt.Println("File reading error", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprint(string(data))))
}

func getLocationDataSize(w http.ResponseWriter, r *http.Request) {
	var request requestData
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error")
		return
	}
	if !isIdValid(request.Id) {
		fmt.Fprintf(w, "Meeep!, Error")
		return
	}

	filePath := filepath.Join(dataDir, request.Id)
	files, _ := ioutil.ReadDir(filePath)
	highest := -1
	for i := 0; i < len(files); i++ {
		number, _ := strconv.Atoi(files[i].Name())
		if number > highest {
			highest = number
		}
	}
	w.Header().Set("Content-Type", "application/text")
	w.Write([]byte(fmt.Sprint(highest)))
}

func getKey(w http.ResponseWriter, r *http.Request) {
	var request requestData
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		fmt.Fprintf(w, "Meeep!, Error")
		return
	}

	filePath := filepath.Join(dataDir, request.Id)
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
		fmt.Fprintf(w, "Meeep!, Error")
		return
	}
	if !isIdValid(location.Id) {
		fmt.Fprintf(w, "Meeep!, Error")
		return
	}
	path := filepath.Join(dataDir, location.Id)
	os.MkdirAll(path, os.ModePerm)
	files, _ := ioutil.ReadDir(path)
	highest := 0
	for i := 0; i < len(files); i++ {
		number, _ := strconv.Atoi(files[i].Name())
		if number > highest {
			highest = number
		}
	}
	highest += 1
	path = filepath.Join(path, strconv.Itoa(highest))
	file, _ := json.MarshalIndent(location, "", " ")
	_ = ioutil.WriteFile(path, file, 0644)
}

func createDevice(w http.ResponseWriter, r *http.Request) {
	body, _ := ioutil.ReadAll(r.Body)
	id := generateNewId(5)
	ids = append(ids, id)

	path := filepath.Join(dataDir, id)
	os.MkdirAll(path, os.ModePerm)
	path = filepath.Join(path, privateKeyFile)
	_ = ioutil.WriteFile(path, body, 0644)
	w.Write([]byte(fmt.Sprint(id)))
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
	http.HandleFunc("/newDevice", createDevice)
	http.HandleFunc("/version", getVersion)
	if fileExists(filepath.Join(filesDir, serverKey)) {
		var err error
		if debug {
			err = http.ListenAndServeTLS(":2020", filepath.Join(filesDir, serverCert), filepath.Join(filesDir, serverKey), nil)
		} else {
			err = http.ListenAndServeTLS(":1008", filepath.Join(filesDir, serverCert), filepath.Join(filesDir, serverKey), nil)
		}
		if err != nil {
			fmt.Println("HTTPS won't be available.", err)
		}
	}
	if debug {
		log.Fatal(http.ListenAndServe(":2021", nil))
	} else {
		log.Fatal(http.ListenAndServe(":1020", nil))
	}
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
		serverConfig = config{PortSecure: "1008", PortUnsecure: "1020", IdLength: 5, MaxSavedLoc: 1000}
		configToString, _ := json.MarshalIndent(serverConfig, "", " ")
		err := ioutil.WriteFile(configFilePath, configToString, 0644)
		fmt.Println(err)
	}

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
	flag.BoolVar(&debug, "t", false, "Start the application on with the test-ports.")
	flag.Parse()

	initServer()

	fmt.Println(serverConfig.MaxSavedLoc)

	fmt.Println("FMD - Server - ", version)
	fmt.Println("Starting Server")
	if debug {
		fmt.Println("Port: 2021(unsecure) 2020(secure)")
	} else {
		fmt.Println("Port: 1020(unsecure) 1008(secure)")
	}
	handleRequests()
}
