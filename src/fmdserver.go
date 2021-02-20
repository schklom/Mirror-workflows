package main

import (
	"log"
	"net/http"
)

func getLocation(w http.ResponseWriter, r *http.Request) {

}

func putLocation(w http.ResponseWriter, r *http.Request) {

}

func handleRequests() {
	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/location", getLocation)
	http.HandleFunc("/newlocation", putLocation)
	log.Fatal(http.ListenAndServe(":8000", nil))
}

func main() {
	handleRequests()
}
