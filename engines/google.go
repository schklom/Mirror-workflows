package engines

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"

	"encoding/json"
	"regexp"

	"github.com/PuerkitoBio/goquery"
)

type GoogleTranslate struct{}

func (_ *GoogleTranslate) DisplayName() string { return "Google Translate" }

func (_ *GoogleTranslate) getLangs(type_ string) (Language, error) {
	var langsType string
	switch type_ {
	case "source":
		langsType = "sl"

	case "target":
		langsType = "tl"

	default:
		return nil, fmt.Errorf("Invalid language type: %s", langsType)
	}

	requestURL, _ := url.Parse("https://translate.google.com/m")

	query := url.Values{}
	query.Add("mui", langsType)
	query.Add("hl", "en-US")
	requestURL.RawQuery = query.Encode()

	response, err := http.Get(requestURL.String())
	if err != nil {
		return nil, err
	}

	defer response.Body.Close()

	doc, err := goquery.NewDocumentFromReader(response.Body)
	if err != nil {
		return nil, err
	}

	var langs Language = make(Language)

	doc.Find(".language-item").Each(func(_ int, s *goquery.Selection) {
		a := s.Find("a").First()

		href, exists := a.Attr("href")
		if !exists {
			return
		}

		langURL, err := url.Parse(href)
		if err != nil {
			return
		}

		langCode := langURL.Query()[langsType][0]

		langs[langCode] = a.Text()
	})

	return langs, nil
}

func (e *GoogleTranslate) SourceLanguages() (Language, error) {
	return e.getLangs("source")
}

func (e *GoogleTranslate) TargetLanguages() (Language, error) {
	return e.getLangs("target")
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
	requestURL, _ := url.Parse("https://translate.google.com/m")

	if from == "" {
		from = "auto"
	}

	query := url.Values{}
	query.Add("sl", from)
	query.Add("tl", to)
	query.Add("hl", to)
	query.Add("q", text)
	requestURL.RawQuery = query.Encode()

	response, err := http.Get(requestURL.String())

	if err != nil {
		return TranslationResult{}, err
	}

	defer response.Body.Close()

	doc, err := goquery.NewDocumentFromReader(response.Body)

	translatedText := doc.Find(".result-container").Text()

	if err != nil {
		return TranslationResult{}, err
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

	responseText = regexp.MustCompile(`\n\d+\n(.*)\n\d+\n`).FindStringSubmatch(responseText)[1]

	var raw []interface{}
	err = json.Unmarshal([]byte(responseText), &raw)
	if err != nil {
		fmt.Println("Error:", err)
		return TranslationResult{}, nil
	}
	definitions := make(map[string][]map[string]interface{})
	translations := make(map[string]map[string]map[string]interface{})

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
	}

	return TranslationResult{
		SourceLanguage: from,
		Definitions:    definitions,
		Translations:   translations,
		TranslatedText: translatedText,
	}, nil
}
