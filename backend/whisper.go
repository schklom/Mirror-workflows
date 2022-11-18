package main

import (
	"encoding/json"
	"log"
	"net/http"
)

const (
	whisperBin = "./whisper"
)

func transcribe(w http.ResponseWriter, _ *http.Request) {
	var response Response
	response.Message = "Not implemented"
	jsonData, err := json.Marshal(response)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Printf("Error marshalling tasks to json: %v", err)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}

func translate(w http.ResponseWriter, _ *http.Request) {
	var response Response
	response.Message = "Not implemented"
	jsonData, err := json.Marshal(response)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Printf("Error marshalling tasks to json: %v", err)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}
