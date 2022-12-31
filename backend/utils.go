package main

import (
	"bufio"
	"encoding/json"
	"log"
	"net/http"
	"os"
)

func getInfo(w http.ResponseWriter, r *http.Request) {
	file, err := os.Open("instance.info")

	if err != nil {
		log.Printf("Error: instance.info file not found!")
		var response Response
		response.Message = "Error: instance.info file not found."
		response.Result = "Error"
		response.Id = "nil"
		w.WriteHeader(http.StatusInternalServerError)
		jsonData, err := json.Marshal(response)
		if err != nil {
			log.Printf("Error marshalling to json: %v", err)
			return
		}
		w.Write(jsonData)

	}
	defer file.Close()

	fileScanner := bufio.NewScanner(file)
	fileScanner.Split(bufio.ScanLines)

	var info InstanceInfo
	info.Version = fileScanner.Text()
	fileScanner.Scan()
	info.CommitHash = fileScanner.Text()

	jsonData, err := json.Marshal(info)
	if err != nil {
		log.Printf("Error marshalling to json: %v", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}
