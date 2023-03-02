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
	WhisperThreads = os.Getenv("WHISPER_THREADS")
	if WhisperThreads == "" {
		log.Printf("No WHISPER_THREADS ENV found. Trying to get .env file.")
		err := godotenv.Load()
		if err != nil {
			log.Printf("No .env file found... Defaulting WHISPER_THREADS to 0")
			WhisperThreads = "4"
		}
		os.Getenv("WHISPER_THREADS")
		if WhisperThreads == "" {
			WhisperThreads = "4"
		}
	}
	WhisperProcs = os.Getenv("WHISPER_PROCESSORS")
	if WhisperProcs == "" {
		log.Printf("No WHISPER_PROCESSORS ENV found. Trying to get .env file.")
		err := godotenv.Load()
		if err != nil {
			log.Printf("No .env file found... Defaulting WHISPER_PROCESSORS to 0")
			WhisperProcs = "1"
		}
		os.Getenv("WHISPER_PROCESSORS")
		if WhisperProcs == "" {
			WhisperProcs = "1"
		}
	}

	WhisperModel = os.Getenv("WHISPER_MODEL")
	if WhisperModel == "" {
		log.Printf("No WHISPER_MODEL ENV found. Trying to get .env file.")
		err := godotenv.Load()
		if err != nil {
			log.Printf("No .env file found... Defaulting WHISPER_MODEL to 0")
			WhisperModel = "small"
		}
		os.Getenv("WHISPER_MODEL")
		if WhisperModel == "" {
			WhisperModel = "small"
		}
	}
	log.Printf("Selected model: %v", WhisperModel)

	CutMediaSeconds = os.Getenv("CUT_MEDIA_SECONDS")
	if CutMediaSeconds == "" {
		log.Printf("No CUT_MEDIA_SECONDS ENV found. Trying to get .env file.")
		err := godotenv.Load()
		if err != nil {
			log.Printf("No .env file found... Defaulting CUT_MEDIA_SECONDS to 0")
			CutMediaSeconds = "0"
		}
		os.Getenv("CUT_MEDIA_SECONDS")
		if CutMediaSeconds == "" {
			CutMediaSeconds = "0"
		}
	}

	KeepFiles = os.Getenv("KEEP_FILES")
	if KeepFiles == "" {
		log.Printf("No KEEP_FILES ENV found. Trying to get .env file.")
		err := godotenv.Load()
		if err != nil {
			log.Printf("No .env file found... Defaulting KEEP_FILES to false")
			KeepFiles = "false"
		}
		os.Getenv("KEEP_FILES")
		if KeepFiles == "" {
			KeepFiles = "false"
		}
	}

	OaiToken = os.Getenv("OPENAI_TOKEN")
	if OaiToken == "" {
		log.Printf("No OPENAI_TOKEN ENV found. Trying to get .env file.")
		err := godotenv.Load()
		if err != nil {
			log.Printf("No .env file found... Defaulting OPENAI_TOKEN to false")
			OaiToken = "false"
		}
		os.Getenv("OPENAI_TOKEN")
		if OaiToken == "" {
			OaiToken = "false"
		}
		if OaiToken == "none" {
			OaiToken = "false"
		}
	}

	DisableLocal = os.Getenv("DISABLE_LOCAL_WHISPER")
	if DisableLocal == "" {
		log.Printf("No DISABLE_LOCAL_WHISPER ENV found. Trying to get .env file.")
		err := godotenv.Load()
		if err != nil {
			log.Printf("No .env file found... Defaulting DISABLE_LOCAL_WHISPER to false")
			DisableLocal = "false"
		}
		os.Getenv("DISABLE_LOCAL_WHISPER")
		if DisableLocal == "" {
			DisableLocal = "false"
		}
		if DisableLocal == "none" {
			DisableLocal = "false"
		}
	}
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
