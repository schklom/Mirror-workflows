package frontend

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
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
		path := strings.TrimPrefix(r.URL.Path, "/")
		path = strings.TrimSuffix(path, "/")

		if f, err := root.Open(path); err == nil {
			stat, _ := f.Stat()
			f.Close()

			if stat.IsDir() {
				htmlPath := path + ".html"
				if htmlFile, err := root.Open(htmlPath); err == nil {
					htmlFile.Close()
					r.URL.Path = "/" + htmlPath
					fileServer.ServeHTTP(w, r)
					return
				}

				http.NotFound(w, r)
				return
			}
		} else if path != "" && !strings.Contains(path, ".") {
			htmlPath := path + ".html"
			if f, err := root.Open(htmlPath); err == nil {
				f.Close()
				r.URL.Path = "/" + htmlPath
			}
		}

		fileServer.ServeHTTP(w, r)
	})
}
