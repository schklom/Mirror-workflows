package main

import (
	"bytes"
	"net/http"
	"net/url"
	"time"

	"codeberg.org/SimpleWeb/SimplyTranslate/engines"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/template/html/v2"
)

func main() {
	engine := html.New("./views", ".html")
	app := fiber.New(fiber.Config{
		Views: engine,
	})

	app.All("/", func(c *fiber.Ctx) error {
		engine := c.Query("engine")
		if _, ok := engines.Engines[engine]; !ok || engine == "" {
			engine = "google"
		}
		targetLanguages, err := engines.Engines[engine].TargetLanguages()
		if err != nil {
			return c.SendStatus(500)
		}
		sourceLanguages, err := engines.Engines[engine].SourceLanguages()
		if err != nil {
			return c.SendStatus(500)
		}
		originalText := ""
		translatedText := ""
		from := ""
		to := ""
		ttsFrom := ""
		ttsTo := ""

		if c.Method() == "POST" {
			from = c.FormValue("from")
			to = c.FormValue("to")
			originalText = c.FormValue("text")
			if result, err := engines.Engines[engine].Translate(originalText, from, to); err != nil {
				return c.SendStatus(500)
			} else {
				translatedText = result.TranslatedText
			}

			ttsFromURL, _ := url.Parse("api/tts")
			fromQuery := url.Values{}
			fromQuery.Add("lang", from)
			fromQuery.Add("text", originalText)
			ttsFromURL.RawQuery = fromQuery.Encode()
			ttsFrom = ttsFromURL.String()

			ttsToURL, _ := url.Parse("api/tts")
			toQuery := url.Values{}
			toQuery.Add("lang", to)
			toQuery.Add("text", translatedText)
			ttsToURL.RawQuery = toQuery.Encode()
			ttsTo = ttsToURL.String()

			fromCookie := new(fiber.Cookie)
			fromCookie.Name = "from"
			fromCookie.Value = from
			fromCookie.Expires = time.Now().Add(24 * time.Hour * 365)
			c.Cookie(fromCookie)

			toCookie := new(fiber.Cookie)
			toCookie.Name = "to"
			toCookie.Value = to
			toCookie.Expires = time.Now().Add(24 * time.Hour * 365)
			c.Cookie(toCookie)

		} else if c.Method() == "GET" {
			from = c.Cookies("from")
			to = c.Cookies("to")
		} else {
			return c.SendStatus(400)
		}
		return c.Render("index", fiber.Map{
			"Engine":          engine,
			"SourceLanguages": targetLanguages,
			"TargetLanguages": sourceLanguages,
			"OriginalText":    originalText,
			"TranslatedText":  translatedText,
			"From":            from,
			"To":              to,
			"TtsFrom":         ttsFrom,
			"TtsTo":           ttsTo,
		})
	})

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
		if _, ok := engines.Engines[engine]; !ok || engine == "" {
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

	app.Get("/api/source_languages", func(c *fiber.Ctx) error {
		engine := c.Query("engine")
		if _, ok := engines.Engines[engine]; !ok || engine == "" {
			engine = "google"
		}
		if result, err := engines.Engines[engine].SourceLanguages(); err != nil {
			return c.SendStatus(500)
		} else {
			return c.JSON(result)
		}
	})

	app.Get("/api/target_languages", func(c *fiber.Ctx) error {
		engine := c.Query("engine")
		if _, ok := engines.Engines[engine]; !ok || engine == "" {
			engine = "google"
		}
		if result, err := engines.Engines[engine].TargetLanguages(); err != nil {
			return c.SendStatus(500)
		} else {
			return c.JSON(result)
		}
	})

	app.Get("/api/tts", func(c *fiber.Ctx) error {
		engine := c.Query("engine")
		if _, ok := engines.Engines[engine]; !ok || engine == "" {
			engine = "google"
		}

		text := c.Query("text")
		if text == "" {
			return c.SendStatus(400)
		}

		lang := c.Query("lang")
		if lang == "" {
			lang = "en"
		}

		if url, err := engines.Engines[engine].Tts(text, lang); err != nil {
			return c.SendStatus(500)
		} else {
			if response, err := http.Get(url); err != nil {
				return c.SendStatus(500)
			} else {
				defer response.Body.Close()
				var buf bytes.Buffer
				response.Write(&buf)
				c.Context().SetContentType("audio/mpeg")
				return c.Send(buf.Bytes())
			}
		}

	})

	app.Static("/static", "./static")

	app.Listen(":3000")
}
