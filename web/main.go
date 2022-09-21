package main

import (
	"codeberg.org/SimpleWeb/SimplyTranslate/engines"
)

// TODO: port web frontend to Go.

func main() {
	engine := &engines.GoogleTranslateEngine{}
	print(engine.DisplayName())
}
