package main

import (
	"log"
	"net/http"
    "fmt"
    "strings"
    "io/ioutil"
    "strconv"
)

func getLocation(w http.ResponseWriter, r *http.Request) {
    id := strings.TrimPrefix(r.URL.Path, "/location/")

    w.Header().Set("Content-Type", "application/json")


    files, err := ioutil.ReadDir("./data/"+id)
    highest := -1
    position := -1

    for i := 0; i< len(files); i++ {
        number, _ := strconv.Atoi(files[i].Name());
        if number > highest {
                highest = number;
                position = i;
        }
    }

    data, err := ioutil.ReadFile("./data/"+id+"/"+files[position].Name())
    if err != nil {
        fmt.Println("File reading error", err)
        return
    }
    w.Write([]byte(fmt.Sprintf(string(data))))
}

func putLocation(w http.ResponseWriter, r *http.Request) {

}

func handleRequests() {
	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/location/", getLocation)
	http.HandleFunc("/newlocation", putLocation)
	log.Fatal(http.ListenAndServe(":8000", nil))
}

func main() {
	handleRequests()
}
