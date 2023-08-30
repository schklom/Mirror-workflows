package main

import (
	"codeberg.org/SimpleWeb/SimplyTranslate/engines"
	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()

	app.All("/api/translate", func(c *fiber.Ctx) error {
		from := ""
		to := ""
		engine := ""
		text := ""
		if c.Method() == "GET" {
			engine = c.Query("engine")
			text = c.Query("text")
			from = c.Query("from")
			to = c.Query("to")
		} else if c.Method() == "POST" {
			engine = c.FormValue("engine")
			text = c.FormValue("text")
			from = c.FormValue("from")
			to = c.FormValue("to")
		} else {
			return c.SendStatus(400)
		}
		if engine == "" {
			engine = "google"
		}
		if to == "" {
			return c.SendStatus(400)
		}
		if result, err := engines.Engines[engine].Translate(text, from, to); err != nil {
			return c.SendStatus(500)
		} else {
			return c.JSON(result)
		}
	})

	app.Listen(":3000")
}
