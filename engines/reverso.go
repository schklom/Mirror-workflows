package engines

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// Reverso is an engine that fetches data from https://reverso.net.
type Reverso struct{}

func (_ *Reverso) InternalName() string { return "reverso" }

func (_ *Reverso) DisplayName() string { return "Reverso" }

var reversoLangs = []Language{
	{Name: "Arabic", Code: "ara"},
	{Name: "Chinese (Simplified)", Code: "chi"}, // marketed as just "Chinese"
	{Name: "Czech", Code: "cze"},
	{Name: "Danish", Code: "dan"},
	{Name: "Dutch", Code: "dut"},
	{Name: "English", Code: "eng"},
	{Name: "French", Code: "fra"},
	{Name: "German", Code: "ger"},
	{Name: "Hebrew", Code: "heb"},
	{Name: "Hindi", Code: "hin"},
	{Name: "Hungarian", Code: "hun"},
	{Name: "Italian", Code: "ita"},
	{Name: "Japanese", Code: "jpn"},
	{Name: "Korean", Code: "kor"},
	{Name: "Persian", Code: "per"},
	{Name: "Polish", Code: "pol"},
	{Name: "Portuguese", Code: "por"},
	{Name: "Romanian", Code: "rum"},
	{Name: "Russian", Code: "rus"},
	{Name: "Slovak", Code: "slo"},
	{Name: "Spanish", Code: "spa"},
	{Name: "Swedish", Code: "swe"},
	{Name: "Thai", Code: "tha"},
	{Name: "Turkish", Code: "tur"},
	{Name: "Ukrainian", Code: "ukr"},
}

func (_ *Reverso) SourceLanguages() ([]Language, error) { return reversoLangs, nil }

func (_ *Reverso) TargetLanguages() ([]Language, error) { return reversoLangs, nil }

func (_ *Reverso) SupportsAutodetect() bool { return true }

type reversoAPIResponse struct {
	LanguageDetection struct {
		DetectedLanguage string `json:"detectedLanguage"`
	} `json:"languageDetection"`
	Translation []string `json:"translation"`
}

func (e *Reverso) callAPI(text string, from, to Language) (reversoAPIResponse, error) {
	// `contextResults` must be false for language detection
	formData := map[string]interface{}{
		"format": "text",
		"from":   from.Code,
		"to":     to.Code,
		"input":  text,
		"options": map[string]interface{}{
			"sentenceSplitter":  false,
			"origin":            "translation.web",
			"contextResults":    false,
			"languageDetection": true,
		},
	}

	formDataJSON, err := json.Marshal(formData)

	if err != nil {
		return reversoAPIResponse{}, err
	}

	request, err := http.NewRequest("POST", "https://api.reverso.net/translate/v1/translation", bytes.NewBuffer(formDataJSON))

	if err != nil {
		return reversoAPIResponse{}, err
	}

	request.Header.Set("Content-Type", "application/json")
	// Returns 403 with empty or no user agent.
	request.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; rv:110.0) Gecko/20100101 Firefox/110.0")

	client := &http.Client{}

	response, err := client.Do(request)

	if err != nil {
		return reversoAPIResponse{}, err
	}

	defer response.Body.Close()

	if response.StatusCode != 200 {
		return reversoAPIResponse{}, fmt.Errorf("got status code %d from Reverso API", response.StatusCode)
	}

	var result reversoAPIResponse

	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return reversoAPIResponse{}, err
	}

	return result, nil
}

func (e *Reverso) DetectLanguage(text string) (Language, error) {
	// Any language pair works here, does not affect result
	r, err := e.callAPI(text, reversoLangs[0], reversoLangs[1])

	if err != nil {
		return Language{}, err
	}

	langCode := r.LanguageDetection.DetectedLanguage

	for _, lang := range reversoLangs {
		if lang.Code == langCode {
			return lang, nil
		}
	}

	return Language{}, fmt.Errorf("language code \"%s\" is not in Reverso's language list", langCode)
}

func (e *Reverso) Translate(text string, from, to Language) (TranslationResult, error) {
	if from.Code == "auto" {
		from_, err := e.DetectLanguage(text)

		if err != nil {
			return TranslationResult{}, err
		}

		from = from_
	}

	var translation string

	if from == to {
		translation = text
	} else {
		r, err := e.callAPI(text, from, to)

		if err != nil {
			return TranslationResult{}, err
		}

		translation = r.Translation[0]
	}

	return TranslationResult{
		SourceLanguage: from,
		TranslatedText: translation,
	}, nil
}
