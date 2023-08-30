package engines

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/PuerkitoBio/goquery"
)

type GoogleTranslate struct{}

func (_ *GoogleTranslate) InternalName() string { return "google" }

func (_ *GoogleTranslate) DisplayName() string { return "Google" }

func (_ *GoogleTranslate) getLangs(type_ string) (Language, error) {
	var langsType string
	switch type_ {
	case "source":
		langsType = "sl"

	case "target":
		langsType = "tl"

	default:
		panic(fmt.Errorf("getLangs was passed an invalid language type: %s", langsType))
	}

	requestURL, _ := url.Parse("https://translate.google.com/m")

	query := url.Values{}
	query.Add("mui", langsType)
	query.Add("hl", "en-US")
	requestURL.RawQuery = query.Encode()

	response, err := http.Get(requestURL.String())

	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	doc, err := goquery.NewDocumentFromReader(response.Body)

	if err != nil {
		return nil, err
	}

	var langs Language

	doc.Find(".language-item").Each(func(_ int, s *goquery.Selection) {
		a := s.Find("a").First()

		href, exists := a.Attr("href")

		// Shouldn't happen, but here goes.
		if !exists {
			return
		}

		langURL, err := url.Parse(href)

		if err != nil {
			return
		}

		langCode := langURL.Query()[langsType][0]

		if langCode == "auto" {
			return
		}

		langs[langCode] = a.Text()
	})

	return langs, nil
}

func (e *GoogleTranslate) SourceLanguages() (Language, error) {
	return e.getLangs("source")
}

func (e *GoogleTranslate) TargetLanguages() (Language, error) {
	return e.getLangs("target")
}

func (_ *GoogleTranslate) DetectLanguage(text string) (string, error) { return "", nil }

func (_ *GoogleTranslate) Translate(text string, from, to string) (TranslationResult, error) {
	requestURL, _ := url.Parse("https://translate.google.com/m")

	if from == "" {
		from = "auto"
	}

	query := url.Values{}
	query.Add("sl", from)
	query.Add("tl", to)
	query.Add("hl", to)
	query.Add("q", text)
	requestURL.RawQuery = query.Encode()

	response, err := http.Get(requestURL.String())

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
