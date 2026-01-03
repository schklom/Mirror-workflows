package frontend

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var webDir embed.FS

func WebDir() fs.FS {
	sub, _ := fs.Sub(webDir, "dist")
	return sub
}
