package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/rs/xid"
)

const (
	whisperBin       = "whisper.cpp/main"
	whisperModelPath = "whisper.cpp/models/ggml-"
	samplesDir       = "whisper.cpp/samples"
)

func getSubsFile(w http.ResponseWriter, r *http.Request) {
	path, err := os.Getwd()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		ReturnServerError(w, r, fmt.Sprintf("Error getting path: %v", err))
		return
	}
	id := r.URL.Query().Get("id")
	if !strings.Contains(id, ".srt") {
		id = fmt.Sprintf("%v.srt", id)
	}

	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		ReturnServerError(w, r, fmt.Sprintf("ID does not exist: %v", err))
		return
	}

	fmt.Println(id)
	w.Header().Set("Content-Disposition", "attachment; filename="+strconv.Quote(fmt.Sprintf("%v", id)))
	w.Header().Set("Content-Type", "application/octet-stream")
	http.ServeFile(w, r, fmt.Sprintf("%v/%v/%v", path, samplesDir, id))
	if KeepFiles != "true" {
		err = os.Remove(fmt.Sprintf("%v/%v/%v", path, samplesDir, id))
		if err != nil {
			log.Printf("Could not remove the .srt file %v.", err)
		}
	}
}

func transcriptionHistory(w http.ResponseWriter, r *http.Request) {
	path, err := os.Getwd()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		ReturnServerError(w, r, fmt.Sprintf("Error getting path: %v", err))
		return
	}
	files, err := ioutil.ReadDir(fmt.Sprintf("%v/%v/", path, samplesDir))
	if err != nil {
		log.Printf("ERROR: Could not read directory")
	}

	fileSt := FileHistory{}
	for _, f := range files {
		if strings.Contains(f.Name(), ".srt") {
			fileSt.Files = append(fileSt.Files, f.Name())
		}
	}
	fmt.Printf("%v", fileSt)

	jsonR, err := json.Marshal(fileSt)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		ReturnServerError(w, r, fmt.Sprintf("Error marshalling to json: %v", err))
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(jsonR)
}

type WebVideo struct {
	Id    string `json:"id"`
	Title string `json:"title"`
}

type OaiResponse struct {
	Text string `json:"text"`
}

func transcribeViaApi(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	default:
		var response Response
		response.Result = "Not allowed"
		jsonData, err := json.Marshal(response)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			log.Printf("Error marshalling tasks to json: %v", err)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write(jsonData)
		return
	case "POST":
		if OaiToken == "none" {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "OpenAI API token not set!")
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			ReturnServerError(w, r, "Failed to read file from form data")
			return
		}
		defer file.Close()

		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		part, err := writer.CreateFormFile("file", header.Filename)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "Failed to create form file")
			return
		}

		if _, err := io.Copy(part, file); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "Failed to copy file into form")
			return
		}

		if err := writer.WriteField("model", "whisper-1"); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "Failed to write model to form")
			return
		}

		if err := writer.Close(); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "Failed to close writer")
			return
		}

		req, err := http.NewRequest("POST", "https://api.openai.com/v1/audio/transcriptions", body)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "Failed to create new request")
			return
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %v", OaiToken))

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "Failed to perform request")
			return
		}
		defer resp.Body.Close()

		response := OaiResponse{}
		if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "Failed to decode response")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(response); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, "Failed to encode response")
			return
		}
	}
}

func transcribeVideo(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	default:
		var response Response
		response.Result = "Not allowed"
		jsonData, err := json.Marshal(response)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			log.Printf("Error marshalling tasks to json: %v", err)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write(jsonData)
		return
	case "POST":
		path, err := os.Getwd()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("Error getting path: %v", err))
			return
		}
		var response Response
		response.Message = ""
		response.Result = ""
		response.Id = ""

		log.Printf("Attempting download of %v", r.FormValue("videoUrl"))

		// Get video info
		jsonVideoInfo, err := exec.Command("yt-dlp", "-j", r.FormValue("videoUrl")).Output()
		fmt.Printf(string(jsonVideoInfo)[:100])
		vid := WebVideo{}
		err = json.Unmarshal(jsonVideoInfo, &vid)
		if err != nil {
			fmt.Printf("ERROR: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("ERROR: marshalling yt-dl json: %v", err))
			return
		}

		_, err = exec.Command("yt-dlp", "-o", fmt.Sprintf("%v/%v/%v", path, samplesDir, "%(id)s.%(ext)s"), "-f", "bestaudio", "-x", r.FormValue("videoUrl")).Output()
		if err != nil {
			_, err = exec.Command("yt-dlp", "-o", fmt.Sprintf("%v/%v/%v", path, samplesDir, "%(id)s.%(ext)s"), "-x", r.FormValue("videoUrl")).Output()
			if err != nil {
				fmt.Printf("ERROR: Unable to download. %v", err)
				w.WriteHeader(http.StatusInternalServerError)
				ReturnServerError(w, r, fmt.Sprintf("ERROR: marshalling yt-dl json: %v", err))
				return
			}
		}

		files, err := os.ReadDir(fmt.Sprintf("%v/%v/", path, samplesDir))
		if len(files) <= 0 || err != nil {
			fmt.Printf("ERROR: Unable to download. %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("ERROR: could not download file: %v", err))
			return
		}

		var fnam string
		for _, file := range files {
			// Extract the filename and the file extension
			filenameParts := strings.Split(file.Name(), ".")
			//extension := filenameParts[len(filenameParts) - 1]
			id := filenameParts[0]

			// Check if the file ID matches
			if id == vid.Id {
				fmt.Println("File: ", file.Name())
				fnam = file.Name()
			}
		}

		// Remove file extension, in order to keep the subtitles filename correct
		fmt.Printf("\n%v/%v/%v.mp3", path, samplesDir, fnam)
		e := os.Rename(fmt.Sprintf("%v/%v/%v", path, samplesDir, fnam), fmt.Sprintf("%v/%v/%v", path, samplesDir, vid.Id))
		if e != nil {
			log.Printf("ERROR: Could not rename file: %v", e)
		}

		// get params
		language := r.FormValue("lang")
		translate, _ := strconv.ParseBool(r.FormValue("translate"))
		getSubs, _ := strconv.ParseBool(r.FormValue("subs"))
		speedUp, _ := strconv.ParseBool(r.FormValue("speedUp"))

		fmt.Printf(vid.Id, r.FormValue("videoUrl"))

		fmt.Printf("ID %s - Title %s", vid.Id, vid.Id)
		/*** FFMPEG ****/
		// Convert source to wav
		err = FfmpegConvert(fmt.Sprintf("%v/%v/%v", path, samplesDir, vid.Id))
		if err != nil {
			ReturnServerError(w, r, fmt.Sprintf("%s", err))
		}

		/*** WHISPER ****/
		// Remove the .wav file extension from the resulting wav (filename.wav -> filename) file
		e = os.Rename(fmt.Sprintf("%v/%v/%v.wav", path, samplesDir, vid.Id), fmt.Sprintf("%v/%v/%v", path, samplesDir, vid.Id))
		if e != nil {
			log.Printf("ERROR: Could not rename file: %v", e)
		}
		// Prepare whisper main args
		sourceFilepath := fmt.Sprintf("%v/%v/%v", path, samplesDir, vid.Id)
		model := fmt.Sprintf("%v/%v%v.bin", path, whisperModelPath, WhisperModel)
		// Get whisper arg array
		whisperArgs := getWhisperArgs(model, language, getSubs, speedUp, translate, sourceFilepath)
		// Run whisper and prepare response
		response.Result, err = runWhisper(whisperArgs)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("Error running whisper: %v", err))
			return
		}
		response.Id = vid.Id

		jsonData, err := json.Marshal(response)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("Error marshalling to json: %v", err))
			return
		}

		if KeepFiles != "true" {
			err = os.Remove(fmt.Sprintf("%v/%v/%v", path, samplesDir, vid.Id))
			if err != nil {
				log.Printf("Could not remove the wav file %v.", err)
			}
		}
		w.WriteHeader(http.StatusOK)
		w.Write(jsonData)
		return
	}
}

func transcribe(w http.ResponseWriter, r *http.Request) {
	path, err := os.Getwd()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		ReturnServerError(w, r, fmt.Sprintf("Error getting path: %v", err))
		return
	}

	switch r.Method {
	case "POST":
		var response Response
		response.Message = ""
		response.Result = ""
		response.Id = ""

		file, header, err := r.FormFile("file")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("Error getting the form file: %v", err))
			return
		}
		defer file.Close()

		language := r.FormValue("lang")
		if language == "" {
			language = "auto"
		}

		guid := xid.New()
		id := guid.String()

		if KeepFiles == "true" && header.Filename != "audio.webm" {
			id = header.Filename
		}

		f, err := os.OpenFile(fmt.Sprintf("%v/%v/%v", path, samplesDir, id), os.O_WRONLY|os.O_CREATE, 0666)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("Error getting the form file: %v", err))
			return
		}
		defer f.Close()
		io.Copy(f, file)

		translate, _ := strconv.ParseBool(r.FormValue("translate"))
		getSubs, _ := strconv.ParseBool(r.FormValue("subs"))
		speedUp, _ := strconv.ParseBool(r.FormValue("speedUp"))

		err = FfmpegConvert(fmt.Sprintf("%v/%v/%v", path, samplesDir, id))
		if err != nil {
			ReturnServerError(w, r, fmt.Sprintf("%s", err))
		}

		e := os.Rename(fmt.Sprintf("%v/%v/%v.wav", path, samplesDir, id), fmt.Sprintf("%v/%v/%v", path, samplesDir, id))
		if e != nil {
			log.Printf("ERROR: Could not rename file: %v", e)
		}

		sourceFilepath := fmt.Sprintf("%v/%v/%v", path, samplesDir, id)
		model := fmt.Sprintf("%v/%v%v.bin", path, whisperModelPath, WhisperModel)
		whisperArgs := getWhisperArgs(model, language, getSubs, speedUp, translate, sourceFilepath)
		response.Result, _ = runWhisper(whisperArgs)
		response.Id = id
		jsonData, err := json.Marshal(response)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("Error marshalling to json: %v", err))
			return
		}

		if KeepFiles != "true" {
			err = os.Remove(fmt.Sprintf("%v/%v/%v", path, samplesDir, id))
			if err != nil {
				log.Printf("Could not remove the wav file %v.", err)
			}
		}
		w.WriteHeader(http.StatusOK)
		w.Write(jsonData)
	default:
		var response Response
		response.Result = "Not allowed"
		jsonData, err := json.Marshal(response)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			ReturnServerError(w, r, fmt.Sprintf("Error marshalling tasks to json: %v", err))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write(jsonData)
	}
}

func runWhisper(args []string) (string, error) {
	path, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("Error getting current path when trying to run whisper.")
	}
	bin := fmt.Sprintf("%v/%v", path, whisperBin)

	// Run whisper
	log.Printf("%v %v", bin, args)
	command := exec.Command(bin, args...)
	fmt.Printf(command.String())
	output, err := exec.Command(bin, args...).Output()
	if err != nil {
		return "", fmt.Errorf("Error while transcribing: %v", err)
	}
	return string(output), nil
}

func getWhisperArgs(model string, language string, getSubs bool, speedUp bool, translate bool, source string) []string {
	// Populate whisper args
	whisperArgs := make([]string, 0)
	whisperArgs = append(whisperArgs, "-m", model, "-nt", "-l", language)
	if getSubs {
		whisperArgs = append(whisperArgs, "-osrt")
	}
	if speedUp { // Speed Up
		whisperArgs = append(whisperArgs, "--speed-up")
	}
	if translate {
		whisperArgs = append(whisperArgs, "--translate")
	}
	fmt.Println(WhisperThreads, WhisperProcs)
	if WhisperThreads != "4" {
		whisperArgs = append(whisperArgs, "-t", WhisperThreads)
	}
	if WhisperProcs != "1" {
		whisperArgs = append(whisperArgs, "-p", WhisperProcs)
	}
	whisperArgs = append(whisperArgs, "-f", source)
	return whisperArgs
}
