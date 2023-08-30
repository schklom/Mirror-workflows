module codeberg.org/SimpleWeb/SimplyTranslate/web

go 1.16

require (
	codeberg.org/SimpleWeb/SimplyTranslate/engines v0.0.0
	github.com/gofiber/fiber/v2 v2.49.0 // indirect
	github.com/gofiber/template/html/v2 v2.0.5
)

replace codeberg.org/SimpleWeb/SimplyTranslate/engines v0.0.0 => ../engines
