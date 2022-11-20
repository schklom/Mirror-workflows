package main

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
)

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(JSONMiddleware)

	r.Post("/transcribe", transcribe)
	r.Get("/getsubs", getSubsFile)
	r.Get("/translate", translate)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://0.0.0.0:9090", "http://127.0.0.1:9090", "http://localhost:9090"},
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodDelete, http.MethodPatch},
	})

	//c := cors.Default()
	handler := c.Handler(r)
	http.ListenAndServe("0.0.0.0:9090", handler)
}

func JSONMiddleware(hndlr http.Handler) http.Handler {
	// This function sets the response content type to json.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		hndlr.ServeHTTP(w, r)
	})
}
