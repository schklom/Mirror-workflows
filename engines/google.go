package engines

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"regexp"
)

type GoogleTranslate struct{}

func (_ *GoogleTranslate) DisplayName() string { return "Google Translate" }

func (_ *GoogleTranslate) getLangs(type_ string) (Language, error) {
	var langsIndex int
	switch type_ {
	case "source":
		langsIndex = 0

	case "target":
		langsIndex = 1

	default:
		return nil, fmt.Errorf("Invalid language type: %s", type_)
	}

	url_ := "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=n9wk7&rt=c"

	req := []interface{}{[]interface{}{[]interface{}{"n9wk7", `["en"]`, nil, "generic"}}}

	JSONString, _ := json.Marshal(req)

	body := "f.req=" + url.QueryEscape(string(JSONString))

	response, err := http.Post(url_, "application/x-www-form-urlencoded;charset=utf-8", bytes.NewBuffer([]byte(body)))
	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	bodyBytes, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	responseTextList := regexp.MustCompile(`\n\d+\n(.*)\n\d+\n`).FindStringSubmatch(string(bodyBytes))
	if len(responseTextList) < 2 {
		return nil, fmt.Errorf("unexpected response from Google Translate")
	}

	var raw []interface{}
	if err := json.Unmarshal([]byte(responseTextList[1]), &raw); err != nil {
		return nil, err
	}

	var json_ []interface{}
	if err := json.Unmarshal([]byte(raw[0].([]interface{})[2].(string)), &json_); err != nil {
		return nil, err
	}

	var langs Language = make(Language)

	for _, lang := range json_[langsIndex].([]interface{}) {
		langs[lang.([]interface{})[0].(string)] = lang.([]interface{})[1].(string)
	}

	return langs, nil
}

var SourceLanguagesCached Language
var TargetLanguagesCached Language

func (e *GoogleTranslate) SourceLanguages() (Language, error) {
	return SourceLanguagesCached, nil
}

func (e *GoogleTranslate) TargetLanguages() (Language, error) {
	return TargetLanguagesCached, nil
}

func (e *GoogleTranslate) Tts(text, lang string) (string, error) {
	requestURL, _ := url.Parse("https://translate.google.com/translate_tts")

	query := url.Values{}
	query.Add("tl", lang)
	query.Add("q", text)
	query.Add("client", "tw-ob")
	requestURL.RawQuery = query.Encode()

	return requestURL.String(), nil
}

func (_ *GoogleTranslate) Translate(text string, from, to string) (TranslationResult, error) {
	if from == "" {
		from = "auto"
	}

	url_ := "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&rt=c"

	reqJSON := []interface{}{
		[]interface{}{text, from, to, true},
		[]interface{}{nil},
	}

	reqJSONString, err := json.Marshal(reqJSON)
	if err != nil {
		fmt.Println("Error:", err)
		return TranslationResult{}, nil
	}

	req := []interface{}{[]interface{}{[]interface{}{"MkEWBc", string(reqJSONString), nil, "generic"}}}

	JSONString, _ := json.Marshal(req)

	body := "f.req=" + url.QueryEscape(string(JSONString))

	resp, err := http.Post(url_, "application/x-www-form-urlencoded;charset=utf-8", bytes.NewBuffer([]byte(body)))
	if err != nil {
		fmt.Println("Error:", err)
		return TranslationResult{}, nil
	}
	defer resp.Body.Close()

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error:", err)
		return TranslationResult{}, nil
	}
	responseText := string(bodyBytes)
	responseTextList := regexp.MustCompile(`\n\d+\n(.*)\n\d+\n`).FindStringSubmatch(responseText)
	definitions := make(map[string][]map[string]interface{})
	translations := make(map[string]map[string]map[string]interface{})
	pronunciation := ""
	translatedText := ""

	if len(responseTextList) > 0 {
		responseText = responseTextList[1]
		var raw []interface{}
		err = json.Unmarshal([]byte(responseText), &raw)
		if err != nil {
			fmt.Println("Error:", err)
			return TranslationResult{}, nil
		}

		if len(raw) > 0 && raw[0] != nil &&
			len(raw[0].([]interface{})) > 2 && raw[0].([]interface{})[2] != nil {
			data := raw[0].([]interface{})[2].(string)

			var json_ []interface{}
			err = json.Unmarshal([]byte(data), &json_)

			if len(json_) > 3 && json_[3] != nil &&
				len(json_[3].([]interface{})) > 1 && json_[3].([]interface{})[1] != nil &&
				len(json_[3].([]interface{})[1].([]interface{})) > 0 && json_[3].([]interface{})[1].([]interface{})[0] != nil {
				for x := 0; x < len(json_[3].([]interface{})[1].([]interface{})[0].([]interface{})); x++ {
					if len(json_[3].([]interface{})[1].([]interface{})[0].([]interface{})[x].([]interface{})) > 0 {
						definitionType := json_[3].([]interface{})[1].([]interface{})[0].([]interface{})[x].([]interface{})[0]
						if definitionType == nil {
							definitionType = "unknown"
						}

						definitions[definitionType.(string)] = []map[string]interface{}{}

						for i := 0; i < len(json_[3].([]interface{})[1].([]interface{})[0].([]interface{})[x].([]interface{})[1].([]interface{})); i++ {
							definitionBox := json_[3].([]interface{})[1].([]interface{})[0].([]interface{})[x].([]interface{})[1].([]interface{})[i].([]interface{})
							definitions[definitionType.(string)] = append(definitions[definitionType.(string)], map[string]interface{}{})

							if len(definitionBox) > 4 && definitionBox[4] != nil &&
								len(definitionBox[4].([]interface{})) > 0 && definitionBox[4].([]interface{})[0] != nil &&
								len(definitionBox[4].([]interface{})[0].([]interface{})) > 0 && definitionBox[4].([]interface{})[0].([]interface{})[0] != nil {
								definitions[definitionType.(string)][i]["dictionary"] = definitionBox[4].([]interface{})[0].([]interface{})[0]
							}

							if len(definitionBox) > 0 && definitionBox[0] != nil {
								definitions[definitionType.(string)][i]["definition"] = definitionBox[0]
							}

							if len(definitionBox) > 1 && definitionBox[1] != nil {
								definitions[definitionType.(string)][i]["use_in_sentence"] = definitionBox[1]
							}

							if len(definitionBox) > 5 && definitionBox[5] != nil {
								definitions[definitionType.(string)][i]["synonyms"] = map[string][]string{}
								synonyms := definitionBox[5].([]interface{})
								synonymsMap := make(map[string][]string)

								for _, synonymBox := range synonyms {
									synonymType := ""
									if len(synonymBox.([]interface{})) > 1 && synonymBox.([]interface{})[1] != nil &&
										len(synonymBox.([]interface{})[1].([]interface{})) > 0 && synonymBox.([]interface{})[1].([]interface{})[0] != nil {
										synonymType = synonymBox.([]interface{})[1].([]interface{})[0].([]interface{})[0].(string)
									}

									if len(synonymBox.([]interface{})) > 0 && synonymBox.([]interface{})[0] != nil {
										synonymList := synonymBox.([]interface{})[0].([]interface{})
										synonymsMap[synonymType] = []string{}
										for _, synonymTypeWord := range synonymList {
											synonymsMap[synonymType] = append(synonymsMap[synonymType], synonymTypeWord.([]interface{})[0].(string))
										}
									}
								}

								definitions[definitionType.(string)][i]["synonyms"] = synonymsMap
							}
						}
					}
				}
			}

			if len(json_) > 3 && json_[3] != nil &&
				len(json_[3].([]interface{})) > 5 && json_[3].([]interface{})[5] != nil &&
				len(json_[3].([]interface{})[5].([]interface{})) > 0 && json_[3].([]interface{})[5].([]interface{})[0] != nil {
				translationBox := json_[3].([]interface{})[5].([]interface{})[0].([]interface{})
				for x := 0; x < len(translationBox); x++ {
					if len(translationBox[x].([]interface{})) > 0 {
						translationType := translationBox[x].([]interface{})[0]
						if translationType == nil {
							translationType = "unknown"
						}
						translations[translationType.(string)] = make(map[string]map[string]interface{})

						if len(translationBox[x].([]interface{})) > 1 && translationBox[x].([]interface{})[1] != nil {
							translationNamesBox := translationBox[x].([]interface{})[1].([]interface{})
							for i := 0; i < len(translationNamesBox); i++ {
								if len(translationNamesBox[i].([]interface{})) > 0 && translationNamesBox[i].([]interface{})[0] != nil {
									translationName := translationNamesBox[i].([]interface{})[0].(string)
									translations[translationType.(string)][translationName] = make(map[string]interface{})
									if len(translationNamesBox[i].([]interface{})) > 3 && translationNamesBox[i].([]interface{})[3] != nil {
										frequency := fmt.Sprintf("%d", int(translationNamesBox[i].([]interface{})[3].(float64)))
										if frequency == "3" {
											frequency = "1"
										} else if frequency == "1" {
											frequency = "3"
										}
										translations[translationType.(string)][translationName]["frequency"] = frequency + "/3"

										translations[translationType.(string)][translationName]["words"] = []string{}
										if len(translationNamesBox[i].([]interface{})) > 2 && translationNamesBox[i].([]interface{})[2] != nil {
											for z := 0; z < len(translationNamesBox[i].([]interface{})[2].([]interface{})); z++ {
												word := translationNamesBox[i].([]interface{})[2].([]interface{})[z].(string)
												translations[translationType.(string)][translationName]["words"] = append(translations[translationType.(string)][translationName]["words"].([]string), word)
											}
										}
									}
								}
							}
						}
					}
				}
			}
			if len(json_) > 0 && json_[0] != nil && len(json_[0].([]interface{})) > 2 && json_[0].([]interface{})[2] != nil {
				from = json_[0].([]interface{})[2].(string)
			}

			if len(json_) > 1 && json_[1] != nil {
				if len(json_[1].([]interface{})[0].([]interface{})) > 0 {
					if len(json_[1].([]interface{})[0].([]interface{})[0].([]interface{})) > 1 {
						raw := json_[1].([]interface{})[0].([]interface{})[0].([]interface{})[1]
						if raw != nil {
							pronunciation = raw.(string)
						}
					}
				}
			}

			// Multi-sentence results are split into segments at index 5.
			if len(json_) > 1 && json_[1] != nil && len(json_[1].([]interface{})[0].([]interface{})) > 0 {
				variant := json_[1].([]interface{})[0].([]interface{})[0].([]interface{})
				if len(variant) > 5 && variant[5] != nil {
					for _, segment := range variant[5].([]interface{}) {
						if len(segment.([]interface{})) > 2 && segment.([]interface{})[2] == true && translatedText != "" {
							translatedText += " "
						}
						translatedText += segment.([]interface{})[0].(string)
					}
				} else if len(variant) > 0 && variant[0] != nil {
					translatedText = variant[0].(string)
				}
			}

		}
	}

	if from == "auto" {
		from = ""
	}

	return TranslationResult{
		SourceLanguage: from,
		Definitions:    definitions,
		Translations:   translations,
		TranslatedText: translatedText,
		Pronunciation:  pronunciation,
	}, nil
}

func init() {
	e := GoogleTranslate{}
	var err error
	SourceLanguagesCached, err = e.getLangs("source")
	fmt.Println(SourceLanguagesCached)
	if err != nil {
		panic("Google Source Languages couldn't be cached")
	}

	TargetLanguagesCached, err = e.getLangs("target")
	if err != nil {
		panic("Google Target Languages couldn't be cached")
	}
}
