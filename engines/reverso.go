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

var reversoLangs = Language{
	"ara": "Arabic",
	"chi": "Chinese (Simplified)", // marketed as just "Chinese"
	"cze": "Czech",
	"dan": "Danish",
	"dut": "Dutch",
	"eng": "English",
	"fra": "French",
	"ger": "German",
	"heb": "Hebrew",
	"hin": "Hindi",
	"hun": "Hungarian",
	"ita": "Italian",
	"jpn": "Japanese",
	"kor": "Korean",
	"per": "Persian",
	"pol": "Polish",
	"por": "Portuguese",
	"rum": "Romanian",
	"rus": "Russian",
	"slo": "Slovak",
	"spa": "Spanish",
	"swe": "Swedish",
	"tha": "Thai",
	"tur": "Turkish",
	"ukr": "Ukrainian",
}

func (_ *Reverso) SourceLanguages() (Language, error) { return reversoLangs, nil }

func (_ *Reverso) TargetLanguages() (Language, error) { return reversoLangs, nil }

func (_ *Reverso) Tts(text, lang string) (string, error) { return "", nil }

type reversoAPIResponse struct {
	LanguageDetection struct {
		DetectedLanguage string `json:"detectedLanguage"`
	} `json:"languageDetection"`
	Translation []string `json:"translation"`
}

func (e *Reverso) callAPI(text string, from, to string) (reversoAPIResponse, error) {
	// `contextResults` must be false for language detection
	formData := map[string]interface{}{
		"format": "text",
		"from":   from,
		"to":     to,
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

func (e *Reverso) DetectLanguage(text string) (string, error) {
	// Any language pair works here, does not affect result
	r, err := e.callAPI(text, "ara", "chi")

	if err != nil {
		return "", err
	}

	langCode := r.LanguageDetection.DetectedLanguage

	for code := range reversoLangs {
		if code == langCode {
			return code, nil
		}
	}

	return "", fmt.Errorf("language code \"%s\" is not in Reverso's language list", langCode)
}

func (e *Reverso) Translate(text string, from, to string) (TranslationResult, error) {
	if from == "auto" {
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
		TranslatedText: translation,
	}, nil
}
