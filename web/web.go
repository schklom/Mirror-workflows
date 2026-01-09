package frontend

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed dist
var webDir embed.FS

func WebDir() fs.FS {
	sub, _ := fs.Sub(webDir, "dist")
	return sub
}

func FileServerWithFallback(root fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(root))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		stat, err := fs.Stat(root, path)

		// If it's a file that exists, serve it
		if err == nil && !stat.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		// For all other routes, serve index.html.
		// This allows the SPA to handle the 404 page.
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})
}
