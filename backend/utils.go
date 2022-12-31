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

	fileScanner := bufio.NewScanner(file)
	fileScanner.Split(bufio.ScanLines)

	var info InstanceInfo
	var fileLines []string
	for fileScanner.Scan() {
		fileLines = append(fileLines, fileScanner.Text())
	}
	file.Close()
	info.CommitHash = fileLines[0]
	info.Version = fileLines[1]

	jsonData, err := json.Marshal(info)
	if err != nil {
		log.Printf("Error marshalling to json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}
