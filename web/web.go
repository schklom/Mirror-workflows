package frontend

import (
	"embed"
	"io/fs"
)

//go:embed assets node_modules *.html *.css *.js *.svg *.ico *.json *.txt
var webDir embed.FS

func WebDir() fs.FS {
	return webDir
}
