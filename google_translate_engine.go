package simplytranslate_engines

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/PuerkitoBio/goquery"
)

type GoogleTranslateEngine struct{}

func (_ *GoogleTranslateEngine) InternalName() string { return "google" }

func (_ *GoogleTranslateEngine) DisplayName() string { return "Google" }

func (_ *GoogleTranslateEngine) getLangs(type_ string) ([]Language, error) {
	var langs_type string
	switch type_ {
	case "source":
		langs_type = "sl"

	case "target":
		langs_type = "tl"

	default:
		panic(fmt.Errorf("getLangs was passed an invalid language type: %s", langs_type))
	}

	request_url, err := url.Parse("https://translate.google.com/m")

	if err != nil {
		// The URL is constant, so it should never fail.
		panic(err)
	}

	query := url.Values{}
	query.Add("mui", langs_type)
	query.Add("hl", "en-US")
	request_url.RawQuery = query.Encode()

	response, err := http.Get(request_url.String())

	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	doc, err := goquery.NewDocumentFromReader(response.Body)

	if err != nil {
		return nil, err
	}

	var langs []Language

	doc.Find(".language-item").Each(func(_ int, s *goquery.Selection) {
		a := s.Find("a").First()

		href, exists := a.Attr("href")

		// Shouldn't happen, but here goes.
		if !exists {
			return
		}

		lang_url, err := url.Parse(href)

		if err != nil {
			return
		}

		lang_code := lang_url.Query()[langs_type][0]

		if lang_code == "auto" {
			return
		}

		langs = append(langs, Language{Name: a.Text(), Code: lang_code})
	})

	return langs, nil
}

func (engine *GoogleTranslateEngine) SourceLanguages() ([]Language, error) {
	return engine.getLangs("source")
}

func (engine *GoogleTranslateEngine) TargetLanguages() ([]Language, error) {
	return engine.getLangs("target")
}

func (_ *GoogleTranslateEngine) SupportsAutodetect() bool { return true }

func (_ *GoogleTranslateEngine) DetectLanguage(text string) (Language, error) { return Language{}, nil }

func (_ *GoogleTranslateEngine) Translate(text string, from Language, to Language) (TranslationResult, error) {
	request_url, err := url.Parse("https://translate.google.com/m")

	if err != nil {
		// The URL is constant, so it should never fail.
		panic(err)
	}

	query := url.Values{}
	query.Add("sl", from.Code)
	query.Add("tl", to.Code)
	query.Add("hl", to.Code)
	query.Add("q", text)
	request_url.RawQuery = query.Encode()

	response, err := http.Get(request_url.String())

	if err != nil {
		return TranslationResult{}, err
	}

	defer response.Body.Close()

	doc, err := goquery.NewDocumentFromReader(response.Body)

	if err != nil {
		return TranslationResult{}, err
	}

	return TranslationResult{
		SourceLanguage: from,
		TranslatedText: doc.Find(".result-container").Text(),
	}, nil
}
