package frontend

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:dist
var webDir embed.FS

func WebDir() fs.FS {
	sub, _ := fs.Sub(webDir, "dist")
	return sub
}

func FileServerWithHTML(root fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(root))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Try to open the requested file
		if f, err := root.Open(path[1:]); err == nil {
			stat, _ := f.Stat()
			f.Close()

			// If it's a file that exists, serve it
			if !stat.IsDir() {
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// For all other routes (SPA fallback), serve index.html
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})
}
