package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

var CutMediaSeconds string
var WhisperModel string
var WhisperThreads string
var WhisperProcs string
var KeepFiles string
var OaiToken string
var DisableLocal string

func setEnvVariables() {
	envVars := []string{"WHISPER_THREADS", "WHISPER_PROCESSORS", "WHISPER_MODEL", "CUT_MEDIA_SECONDS", "KEEP_FILES", "OPENAI_TOKEN", "DISABLE_LOCAL_WHISPER"}
	defaultVars := [...]string{"4", "1", "small", "0", "false", "false", "false"}

	for i, envVarName := range envVars {
		value := os.Getenv(envVarName)
		if value == "" {
			log.Printf("No %s ENV found. Trying to get .env file.", envVarName)
			err := godotenv.Load()
			if err != nil {
				log.Printf("No .env file found... Defaulting %s to %s", envVarName, defaultVars[i])
				value = defaultVars[i]
			} else {
				value = os.Getenv(envVarName)
				if value == "" {
					value = defaultVars[i]
				}
			}
		}

		switch envVarName {
		case "WHISPER_THREADS":
			WhisperThreads = value
		case "WHISPER_PROCESSORS":
			WhisperProcs = value
		case "WHISPER_MODEL":
			WhisperModel = value
			log.Printf("Selected model: %v", WhisperModel)
		case "CUT_MEDIA_SECONDS":
			CutMediaSeconds = value
		case "KEEP_FILES":
			KeepFiles = value
		case "OPENAI_TOKEN":
			if value == "none" {
				value = "false"
			}
			OaiToken = value
		case "DISABLE_LOCAL_WHISPER":
			DisableLocal = value
		default:
			log.Printf("Unknown environment variable %s", envVarName)
		}
	}

	log.Println("Configuration:")
	log.Printf("Local Whisper Disabled: %v", DisableLocal)
	log.Printf("Keep Files: %v", KeepFiles)
	log.Printf("Cut Media At: %vs", CutMediaSeconds)
	log.Printf("Local Whisper  Model: %v", WhisperModel)
}

func main() {
	// Get the environment variables
	setEnvVariables()

	// Setup the router and routes
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(JSONMiddleware)

	if DisableLocal == "false" {
		r.Post("/transcribe", transcribe)
		r.Post("/video/transcribe", transcribeVideo)
		r.Get("/getsubs", getSubsFile)
		r.Get("/status", getInfo)
		r.Get("/history", transcriptionHistory)
	}

	// Interact wiht OpenAI api (through backend)
	if OaiToken != "false" {
		r.Post("/api/whisper", transcribeViaApi)
	}

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodDelete, http.MethodPatch},
	})

	handler := c.Handler(r)
	log.Printf("Starting backend server at :9090...")
	http.ListenAndServe(":9090", handler)
}

func JSONMiddleware(hndlr http.Handler) http.Handler {
	// This function sets the response content type to json.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		hndlr.ServeHTTP(w, r)
	})
}
