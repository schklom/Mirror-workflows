package engines

import "os"

type TranslationResult struct {
	SourceLanguage string      `json:"source_language"`
	Definitions    interface{} `json:"definitions"`
	Translations   interface{} `json:"translations"`
	TranslatedText string      `json:"translated_text"`
}

type Engine interface {
	DisplayName() string
	SourceLanguages() (Language, error)
	TargetLanguages() (Language, error)
	Translate(text string, from, to string) (TranslationResult, error)
	Tts(text, lang string) (string, error)
}

type Language map[string]string

var Engines = map[string]Engine{}

func init() {
	map_ := map[string]Engine{}
	if os.Getenv("GOOGLETRANSLATE_ENABLE") == "true" {
		map_["google"] = &GoogleTranslate{}
	}
	if os.Getenv("ICIBA_ENABLE") == "true" {
		map_["iciba"] = &ICIBA{}
	}
	if os.Getenv("REVERSO_ENABLE") == "true" {
		map_["reverso"] = &Reverso{}
	}
	Engines = map_
}
