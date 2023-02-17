package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	ffmpeg "github.com/u2takey/ffmpeg-go"
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

func FfmpegConvert(path string) error {
	/*** FFMPEG ****/
	ffmpegArgs := make([]ffmpeg.KwArgs, 0)
	// Load .env variables
	if CutMediaSeconds != "0" {
		ffmpegArgs = append(ffmpegArgs, ffmpeg.KwArgs{"t": CutMediaSeconds})
	}
	// Append all args and merge to single KwArgs
	ffmpegArgs = append(ffmpegArgs, ffmpeg.KwArgs{"ar": 16000, "ac": 1, "c:a": "pcm_s16le"})
	args := ffmpeg.MergeKwArgs(ffmpegArgs)

	// We convert the media file to a .wav file. The resulting file is {id}.wav
	err := ffmpeg.Input(fmt.Sprintf("%v", path)).
		Output(fmt.Sprintf("%v.wav", path), args).
		OverWriteOutput().ErrorToStdOut().Run()
	if err != nil {
		log.Printf("%v", err)
		return fmt.Errorf("Error while encoding to wav: %v", err)
	}

	// Remove old file ({id})
	err = os.Remove(fmt.Sprintf("%v", path))
	if err != nil {
		log.Printf("ERROR: Could not remove file: %v", err)
		return fmt.Errorf("ERROR: Could not remove file: %v", err)
	}
	return nil
}

func ReturnServerError(w http.ResponseWriter, r *http.Request, message string) {
	var response Response
	response.Message = message
	response.Result = ""
	response.Id = ""

	log.Printf("ERROR: %v", message)
	jsonData, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshalling to json: %v", err)
		return
	}

	//w.WriteHeader(http.StatusInternalServerError)
	w.Write(jsonData)
}
