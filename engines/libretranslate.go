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
	// InstanceURL is the URL to a LibreTranslate instance, for example
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

func (_ *LibreTranslate) DisplayName() string { return "LibreTranslate" }

func (e *LibreTranslate) getLangs() (Language, error) {
	response, err := http.Get(e.InstanceURL + "/languages")

	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	if response.StatusCode != 200 {
		return nil, fmt.Errorf("got status code %d from LibreTranslate API", response.StatusCode)
	}

	var langsResponse []struct {
		Name string `json:"name"`
		Code string `json:"code"`
	}

	if err := json.NewDecoder(response.Body).Decode(&langsResponse); err != nil {
		return nil, err
	}

	langs := Language{}

	for _, lang := range langsResponse {
		langs[lang.Code] = lang.Name
	}

	return langs, nil

}

func (e *LibreTranslate) SourceLanguages() (Language, error) { return e.getLangs() }

func (e *LibreTranslate) TargetLanguages() (Language, error) { return e.getLangs() }

func (e *LibreTranslate) Tts(text, lang string) (string, error) { return "", nil }

type libreDetectResponse []struct {
	Confidence   float64 `json:"confidence"`
	LanguageCode string  `json:"language"`
}

func (e *LibreTranslate) detectLanguage(text string) (string, error) {
	formData := map[string]string{"q": text}

	if e.APIKey != "" {
		formData["api_key"] = e.APIKey
	}

	formDataJSON, err := json.Marshal(formData)

	if err != nil {
		return "", err
	}

	response, err := http.Post(e.InstanceURL+"/detect", "application/json", bytes.NewBuffer(formDataJSON))

	if err != nil {
		return "", err
	}

	defer response.Body.Close()

	if response.StatusCode != 200 {
		return "", fmt.Errorf("got status code %d from LibreTranslate API", response.StatusCode)
	}

	var langs libreDetectResponse

	if err := json.NewDecoder(response.Body).Decode(&langs); err != nil {
		return "", err
	}

	maxConfidenceLang := langs[0]

	for _, lang := range langs[1:] {
		if lang.Confidence > maxConfidenceLang.Confidence {
			maxConfidenceLang = lang
		}
	}

	engineLangs, err := e.getLangs()

	if err != nil {
		return "", err
	}

	for code := range engineLangs {
		if code == maxConfidenceLang.LanguageCode {
			return code, nil
		}
	}

	return "", fmt.Errorf("language code \"%s\" is not in the instance's language list", maxConfidenceLang.LanguageCode)
}

func (e *LibreTranslate) Translate(text string, from, to string) (TranslationResult, error) {
	formData := map[string]string{
		"q":      text,
		"source": from,
		"target": to,
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

	var responseJSON struct {
		TranslatedText string `json:"translatedText"`
	}

	if err := json.NewDecoder(response.Body).Decode(&responseJSON); err != nil {
		return TranslationResult{}, err
	}

	if r, err := e.detectLanguage(text); err == nil {
		from = r
	}

	return TranslationResult{
		TranslatedText: responseJSON.TranslatedText,
		SourceLanguage: from,
	}, nil
}
