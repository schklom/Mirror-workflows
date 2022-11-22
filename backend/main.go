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

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(JSONMiddleware)

	r.Post("/transcribe", transcribe)
	r.Get("/getsubs", getSubsFile)
	r.Get("/translate", translate)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodDelete, http.MethodPatch},
	})

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

	//c := cors.Default()
	handler := c.Handler(r)
	log.Printf("Starting backend server...")
	http.ListenAndServe(":9090", handler)
	log.Printf("OK")
}

func JSONMiddleware(hndlr http.Handler) http.Handler {
	// This function sets the response content type to json.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		hndlr.ServeHTTP(w, r)
	})
}
