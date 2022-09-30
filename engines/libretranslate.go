package engines

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// LibreTranslate is an engine that interfaces with any
// [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate) instance.
type LibreTranslate struct {
	// InstanceURL is the URL to a LibreTranslate instance, for instance
	// "https://libretranslate.com".
	InstanceURL string
	// APIKey is the API key for the given instance. If empty, then no API
	// key will be sent along with requests to the instance.
	//
	// Some instances issue API keys to users so that they can have a
	// higher rate limit. See
	// https://github.com/LibreTranslate/LibreTranslate#manage-api-keys for
	// more information.
	APIKey string
}

func (_ *LibreTranslate) InternalName() string { return "libre" }

func (_ *LibreTranslate) DisplayName() string { return "LibreTranslate" }

type libreLanguagesResponse []struct {
	Name string `json:"name"`
	Code string `json:"code"`
}

func (e *LibreTranslate) getLangs() ([]Language, error) {
	response, err := http.Get(e.InstanceURL + "/languages")

	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	if response.StatusCode != 200 {
		return nil, fmt.Errorf("got status code %d from LibreTranslate API", response.StatusCode)
	}

	var langsResponse libreLanguagesResponse

	if err := json.NewDecoder(response.Body).Decode(&langsResponse); err != nil {
		return nil, err
	}

	langs := make([]Language, len(langsResponse))

	for i, lang := range langsResponse {
		langs[i] = Language{Name: lang.Name, Code: lang.Code}
	}

	return langs, nil

}

func (e *LibreTranslate) SourceLanguages() ([]Language, error) { return e.getLangs() }

func (e *LibreTranslate) TargetLanguages() ([]Language, error) { return e.getLangs() }

func (_ *LibreTranslate) SupportsAutodetect() bool { return true }

type libreDetectResponse []struct {
	Confidence   float64 `json:"confidence"`
	LanguageCode string  `json:"language"`
}

func (e *LibreTranslate) DetectLanguage(text string) (Language, error) {
	formData := map[string]string{"q": text}

	if e.APIKey != "" {
		formData["api_key"] = e.APIKey
	}

	formDataJSON, err := json.Marshal(formData)

	if err != nil {
		return Language{}, err
	}

	response, err := http.Post(e.InstanceURL+"/detect", "application/json", bytes.NewBuffer(formDataJSON))

	if err != nil {
		return Language{}, err
	}

	defer response.Body.Close()

	if response.StatusCode != 200 {
		return Language{}, fmt.Errorf("got status code %d from LibreTranslate API", response.StatusCode)
	}

	var langs libreDetectResponse

	if err := json.NewDecoder(response.Body).Decode(&langs); err != nil {
		return Language{}, err
	}

	maxConfidenceLang := langs[0]

	for _, lang := range langs[1:] {
		if lang.Confidence > maxConfidenceLang.Confidence {
			maxConfidenceLang = lang
		}
	}

	engineLangs, err := e.getLangs()

	if err != nil {
		return Language{}, err
	}

	for _, lang := range engineLangs {
		if lang.Code == maxConfidenceLang.LanguageCode {
			return lang, nil
		}
	}

	return Language{}, fmt.Errorf("language code \"%s\" is not in the instance's language list", maxConfidenceLang.LanguageCode)
}

type libreTranslateResponse struct {
	TranslatedText string `json:"translatedText"`
}

func (e *LibreTranslate) Translate(text string, from Language, to Language) (TranslationResult, error) {
	formData := map[string]string{
		"q":      text,
		"source": from.Code,
		"target": to.Code,
	}

	if e.APIKey != "" {
		formData["api_key"] = e.APIKey
	}

	formDataJSON, err := json.Marshal(formData)

	if err != nil {
		return TranslationResult{}, err
	}

	response, err := http.Post(e.InstanceURL+"/translate", "application/json", bytes.NewBuffer(formDataJSON))

	if err != nil {
		return TranslationResult{}, err
	}

	defer response.Body.Close()

	if response.StatusCode != 200 {
		return TranslationResult{}, fmt.Errorf("got status code %d from LibreTranslate API", response.StatusCode)
	}

	var responseJSON libreTranslateResponse

	if err := json.NewDecoder(response.Body).Decode(&responseJSON); err != nil {
		return TranslationResult{}, err
	}

	return TranslationResult{SourceLanguage: from, TranslatedText: responseJSON.TranslatedText}, nil
}
