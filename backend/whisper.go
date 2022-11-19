package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"

	"github.com/google/uuid"
	ffmpeg "github.com/u2takey/ffmpeg-go"
)

const (
	whisperBin   = "whisper.cpp/main"
	whisperModel = "whisper.cpp/models/ggml-small.bin"
	samplesDir   = "whisper.cpp/samples"
)

func transcribe(w http.ResponseWriter, r *http.Request) {
	path, err := os.Getwd()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Printf("Error getting path: %v", err)
		return
	}

	switch r.Method {
	case "GET":
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	case "POST":
		file, _, err := r.FormFile("file")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			log.Printf("Error getting the form file: %v", err)
			return
		}
		defer file.Close()

		language := r.FormValue("lang")
		fmt.Println(language)

		id := uuid.New()
		f, err := os.OpenFile(fmt.Sprintf("%v/%v.webm", samplesDir, id.String()), os.O_WRONLY|os.O_CREATE, 0666)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			log.Printf("Error getting the form file: %v", err)
			return
		}
		defer f.Close()
		io.Copy(f, file)

		err = ffmpeg.Input(fmt.Sprintf("%v/%v/%v.webm", path, samplesDir, id.String())).
			Output(fmt.Sprintf("%v/%v/%v.wav", path, samplesDir, id.String()), ffmpeg.KwArgs{"ar": 16000, "ac": 1, "c:a": "pcm_s16le"}).
			OverWriteOutput().ErrorToStdOut().Run()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			log.Printf("Error while encoding to wav: %v", err)
			return
		}

		err = os.Remove(fmt.Sprintf("%v/%v/%v.webm", path, samplesDir, id.String()))
		if err != nil {
			log.Printf("Could not remove file.")
		}

		commandString := fmt.Sprintf("%v/%v", path, whisperBin)
		targetFilepath := fmt.Sprintf("%v/%v/%v.wav", path, samplesDir, id.String())
		output, err := exec.Command(commandString, "-m", whisperModel, "-nt", "-l", language, "-f", targetFilepath).Output()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			log.Printf("Error while transcribing: %v", err)
			return
		}
		var response Response

		response.Result = string(output)

		jsonData, err := json.Marshal(response)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			log.Printf("Error marshalling tasks to json: %v", err)
			return
		}

		err = os.Remove(fmt.Sprintf("%v/%v/%v.wav", path, samplesDir, id.String()))
		if err != nil {
			log.Printf("Could not remove the .wav file %v.", err)
		}
		w.WriteHeader(http.StatusOK)
		w.Write(jsonData)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
}

func translate(w http.ResponseWriter, _ *http.Request) {
	var response Response
	response.Result = "Not implemented"
	jsonData, err := json.Marshal(response)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Printf("Error marshalling tasks to json: %v", err)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
}
