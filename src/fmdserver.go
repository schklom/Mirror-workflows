package main

import (
	"log"
	"net/http"
    "fmt"
    "strings"
    "io/ioutil"
    "strconv"
    "encoding/json"
    "path/filepath"
    "os"
)

//Some variables
const port = 8000
const dataDir = "data"

type locationData struct {
	Id string `'json:"id"`
	Date uint64 `'json:"date"`
    Lon string `json:"lon"`
	Lat string `json:"lat"`
}

func getLocation(w http.ResponseWriter, r *http.Request) {
    id := strings.TrimPrefix(r.URL.Path, "/location/")
    w.Header().Set("Content-Type", "application/json")

    filePath := filepath.Join(dataDir, id)
    files, err := ioutil.ReadDir(filePath)
    highest := -1
    position := -1
    for i := 0; i< len(files); i++ {
        number, _ := strconv.Atoi(files[i].Name());
        if number > highest {
                highest = number;
                position = i;
        }
    }
    filePath = filepath.Join(filePath, files[position].Name())
    data, err := ioutil.ReadFile(filePath)
    if err != nil {
        fmt.Println("File reading error", err)
        return
    }
    w.Write([]byte(fmt.Sprintf(string(data))))
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
    files, err := ioutil.ReadDir(path)
    highest := 0
    for i := 0; i< len(files); i++ {
        number, _ := strconv.Atoi(files[i].Name())
        if number > highest {
                highest = number;
        }
    }
    highest += 1
    path = filepath.Join(path, strconv.Itoa(highest))
    file, _ := json.MarshalIndent(location, "", " ")
 	_ = ioutil.WriteFile(path, file, 0644)
}

func handleRequests() {
	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/location/", getLocation)
	http.HandleFunc("/newlocation", putLocation)
    //http.ListenAndServeTLS(":8001", "server.crt", "server.key", nil)
	log.Fatal(http.ListenAndServe(":8000", nil))
}

func main() {
    fmt.Println("FMD - Server\nStarting Server");
	handleRequests()
}
