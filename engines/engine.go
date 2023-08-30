package engines

type TranslationResult struct {
	SourceLanguage string `json:"source_language"`
	TranslatedText string `json:"translated_text"`
}

type Engine interface {
	InternalName() string
	DisplayName() string
	SourceLanguages() (Language, error)
	TargetLanguages() (Language, error)
	Translate(text string, from, to string) (TranslationResult, error)
	DetectLanguage(text string) (string, error)
}

type Language map[string]string

var Engines = map[string]Engine{
	"google":   &GoogleTranslate{},
	"icibia":   &ICIBA{},
	"libre":    &LibreTranslate{},
	"reverseo": &Reverso{},
}
