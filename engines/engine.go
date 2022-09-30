package engines

type TranslationResult struct {
	SourceLanguage Language
	TranslatedText string
}

type Engine interface {
	InternalName() string
	DisplayName() string
	SourceLanguages() ([]Language, error)
	TargetLanguages() ([]Language, error)
	Translate(text string, from, to Language) (TranslationResult, error)
	SupportsAutodetect() bool
	DetectLanguage(text string) (Language, error)
}
