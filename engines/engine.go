package engines

type TranslationResult struct {
	SourceLanguage Language
	TranslatedText string
}

type TranslationEngine interface {
	InternalName() string
	DisplayName() string
	SourceLanguages() ([]Language, error)
	TargetLanguages() ([]Language, error)
	Translate(text string, from Language, to Language) (TranslationResult, error)
	SupportsAutodetect() bool
	DetectLanguage(text string) (Language, error)
}
