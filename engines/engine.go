package engines

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

var Engines = map[string]Engine{
	"google": &GoogleTranslate{},
	// "icibia": &ICIBA{},
	// "libre":    &LibreTranslate{},
	"reverso": &Reverso{},
}
