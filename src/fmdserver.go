package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

//Some IO variables
const dataDir = "data"
const privateKeyFile = "privkey"

var ids []string

type locationData struct {
	Id       string `'json:"id"`
	Provider string `'json:"provider"`
	Date     uint64 `'json:"date"`
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
	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/location", getLocation)
	http.HandleFunc("/locationDataSize", getLocationDataSize)
	http.HandleFunc("/key", getKey)
	http.HandleFunc("/newlocation", putLocation)
	http.HandleFunc("/newDevice", createDevice)
	//http.ListenAndServeTLS(":8001", "server.crt", "server.key", nil)
	log.Fatal(http.ListenAndServe(":8000", nil))
}

func initData() {
	fmt.Println("Init: Preparing FMD-Server...")
	filePath := filepath.Join(dataDir)
	dirs, _ := ioutil.ReadDir(filePath)
	for i := 0; i < len(dirs); i++ {
		ids = append(ids, dirs[i].Name())
	}
	fmt.Printf("Init: %d Devices registered.\n\n", len(ids))
}

func main() {
	initData()
	fmt.Println("FMD - Server")
	fmt.Println("Starting Server")
	fmt.Println("Port: 8000")
	handleRequests()
}
