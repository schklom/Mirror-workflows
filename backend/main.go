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

func setEnvVariables() {
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
}

func main() {
	// Get the environment variables
	setEnvVariables()

	// Setup the router and routes
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(JSONMiddleware)

	r.Post("/transcribe", transcribe)
	r.Get("/getsubs", getSubsFile)

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
