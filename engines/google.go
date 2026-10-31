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
	switch type_ {
	case "source":
		return Language{
			"auto":     "Detect language",
			"ab":       "Abkhaz",
			"ace":      "Acehnese",
			"ach":      "Acholi",
			"aa":       "Afar",
			"af":       "Afrikaans",
			"sq":       "Albanian",
			"alz":      "Alur",
			"am":       "Amharic",
			"ar":       "Arabic",
			"hy":       "Armenian",
			"as":       "Assamese",
			"av":       "Avar",
			"awa":      "Awadhi",
			"ay":       "Aymara",
			"az":       "Azerbaijani",
			"ban":      "Balinese",
			"bal":      "Baluchi",
			"bm":       "Bambara",
			"bci":      "Baoulé",
			"ba":       "Bashkir",
			"eu":       "Basque",
			"btx":      "Batak Karo",
			"bts":      "Batak Simalungun",
			"bbc":      "Batak Toba",
			"be":       "Belarusian",
			"bem":      "Bemba",
			"bn":       "Bengali",
			"bew":      "Betawi",
			"bho":      "Bhojpuri",
			"bik":      "Bikol",
			"bs":       "Bosnian",
			"br":       "Breton",
			"bg":       "Bulgarian",
			"bua":      "Buryat",
			"yue":      "Cantonese",
			"ca":       "Catalan",
			"ceb":      "Cebuano",
			"ch":       "Chamorro",
			"ce":       "Chechen",
			"ny":       "Chichewa",
			"zh-CN":    "Chinese (Simplified)",
			"zh-TW":    "Chinese (Traditional)",
			"chk":      "Chuukese",
			"cv":       "Chuvash",
			"co":       "Corsican",
			"crh":      "Crimean Tatar (Cyrillic)",
			"crh-Latn": "Crimean Tatar (Latin)",
			"hr":       "Croatian",
			"cs":       "Czech",
			"da":       "Danish",
			"fa-AF":    "Dari",
			"dv":       "Dhivehi",
			"din":      "Dinka",
			"doi":      "Dogri",
			"dov":      "Dombe",
			"nl":       "Dutch",
			"dyu":      "Dyula",
			"dz":       "Dzongkha",
			"en":       "English",
			"eo":       "Esperanto",
			"et":       "Estonian",
			"ee":       "Ewe",
			"fo":       "Faroese",
			"fj":       "Fijian",
			"tl":       "Filipino",
			"fi":       "Finnish",
			"fon":      "Fon",
			"fr":       "French",
			"fr-CA":    "French (Canada)",
			"fy":       "Frisian",
			"fur":      "Friulian",
			"ff":       "Fulani",
			"gaa":      "Ga",
			"gl":       "Galician",
			"ka":       "Georgian",
			"de":       "German",
			"el":       "Greek",
			"gn":       "Guarani",
			"gu":       "Gujarati",
			"ht":       "Haitian Creole",
			"cnh":      "Hakha Chin",
			"ha":       "Hausa",
			"haw":      "Hawaiian",
			"iw":       "Hebrew",
			"hil":      "Hiligaynon",
			"hi":       "Hindi",
			"hmn":      "Hmong",
			"hu":       "Hungarian",
			"hrx":      "Hunsrik",
			"iba":      "Iban",
			"is":       "Icelandic",
			"ig":       "Igbo",
			"ilo":      "Ilocano",
			"id":       "Indonesian",
			"iu-Latn":  "Inuktut (Latin)",
			"iu":       "Inuktut (Syllabics)",
			"ga":       "Irish",
			"it":       "Italian",
			"jam":      "Jamaican Patois",
			"ja":       "Japanese",
			"jw":       "Javanese",
			"kac":      "Jingpo",
			"kl":       "Kalaallisut",
			"kn":       "Kannada",
			"kr":       "Kanuri",
			"pam":      "Kapampangan",
			"kk":       "Kazakh",
			"kha":      "Khasi",
			"km":       "Khmer",
			"cgg":      "Kiga",
			"kg":       "Kikongo",
			"rw":       "Kinyarwanda",
			"ktu":      "Kituba",
			"trp":      "Kokborok",
			"kv":       "Komi",
			"gom":      "Konkani",
			"ko":       "Korean",
			"kri":      "Krio",
			"ku":       "Kurdish (Kurmanji)",
			"ckb":      "Kurdish (Sorani)",
			"ky":       "Kyrgyz",
			"lo":       "Lao",
			"ltg":      "Latgalian",
			"la":       "Latin",
			"lv":       "Latvian",
			"lij":      "Ligurian",
			"li":       "Limburgish",
			"ln":       "Lingala",
			"lt":       "Lithuanian",
			"lmo":      "Lombard",
			"lg":       "Luganda",
			"luo":      "Luo",
			"lb":       "Luxembourgish",
			"mk":       "Macedonian",
			"mad":      "Madurese",
			"mai":      "Maithili",
			"mak":      "Makassar",
			"mg":       "Malagasy",
			"ms":       "Malay",
			"ms-Arab":  "Malay (Jawi)",
			"ml":       "Malayalam",
			"mt":       "Maltese",
			"mam":      "Mam",
			"gv":       "Manx",
			"mi":       "Maori",
			"mr":       "Marathi",
			"mh":       "Marshallese",
			"mwr":      "Marwadi",
			"mfe":      "Mauritian Creole",
			"chm":      "Meadow Mari",
			"mni-Mtei": "Meiteilon (Manipuri)",
			"min":      "Minang",
			"lus":      "Mizo",
			"mn":       "Mongolian",
			"my":       "Myanmar (Burmese)",
			"bm-Nkoo":  "NKo",
			"nhe":      "Nahuatl (Eastern Huasteca)",
			"ndc-ZW":   "Ndau",
			"nr":       "Ndebele (South)",
			"new":      "Nepalbhasa (Newari)",
			"ne":       "Nepali",
			"no":       "Norwegian",
			"nus":      "Nuer",
			"oc":       "Occitan",
			"or":       "Odia (Oriya)",
			"om":       "Oromo",
			"os":       "Ossetian",
			"pag":      "Pangasinan",
			"pap":      "Papiamento",
			"ps":       "Pashto",
			"fa":       "Persian",
			"pl":       "Polish",
			"pt":       "Portuguese (Brazil)",
			"pt-PT":    "Portuguese (Portugal)",
			"pa":       "Punjabi (Gurmukhi)",
			"pa-Arab":  "Punjabi (Shahmukhi)",
			"qu":       "Quechua",
			"kek":      "Qʼeqchiʼ",
			"rom":      "Romani",
			"ro":       "Romanian",
			"rn":       "Rundi",
			"ru":       "Russian",
			"se":       "Sami (North)",
			"sm":       "Samoan",
			"sg":       "Sango",
			"sa":       "Sanskrit",
			"sat-Latn": "Santali (Latin)",
			"sat":      "Santali (Ol Chiki)",
			"gd":       "Scots Gaelic",
			"nso":      "Sepedi",
			"sr":       "Serbian",
			"st":       "Sesotho",
			"crs":      "Seychellois Creole",
			"shn":      "Shan",
			"sn":       "Shona",
			"scn":      "Sicilian",
			"szl":      "Silesian",
			"sd":       "Sindhi",
			"si":       "Sinhala",
			"sk":       "Slovak",
			"sl":       "Slovenian",
			"so":       "Somali",
			"es":       "Spanish",
			"su":       "Sundanese",
			"sus":      "Susu",
			"sw":       "Swahili",
			"ss":       "Swati",
			"sv":       "Swedish",
			"ty":       "Tahitian",
			"tg":       "Tajik",
			"ber-Latn": "Tamazight",
			"ber":      "Tamazight (Tifinagh)",
			"ta":       "Tamil",
			"tt":       "Tatar",
			"te":       "Telugu",
			"tet":      "Tetum",
			"th":       "Thai",
			"bo":       "Tibetan",
			"ti":       "Tigrinya",
			"tiv":      "Tiv",
			"tpi":      "Tok Pisin",
			"to":       "Tongan",
			"lua":      "Tshiluba",
			"ts":       "Tsonga",
			"tn":       "Tswana",
			"tcy":      "Tulu",
			"tum":      "Tumbuka",
			"tr":       "Turkish",
			"tk":       "Turkmen",
			"tyv":      "Tuvan",
			"ak":       "Twi",
			"udm":      "Udmurt",
			"uk":       "Ukrainian",
			"ur":       "Urdu",
			"ug":       "Uyghur",
			"uz":       "Uzbek",
			"ve":       "Venda",
			"vec":      "Venetian",
			"vi":       "Vietnamese",
			"war":      "Waray",
			"cy":       "Welsh",
			"wo":       "Wolof",
			"xh":       "Xhosa",
			"sah":      "Yakut",
			"yi":       "Yiddish",
			"yo":       "Yoruba",
			"yua":      "Yucatec Maya",
			"zap":      "Zapotec",
			"zu":       "Zulu",
		}, nil

	case "target":
		return Language{
			"ab":       "Abkhaz",
			"ace":      "Acehnese",
			"ach":      "Acholi",
			"aa":       "Afar",
			"af":       "Afrikaans",
			"sq":       "Albanian",
			"alz":      "Alur",
			"am":       "Amharic",
			"ar":       "Arabic",
			"hy":       "Armenian",
			"as":       "Assamese",
			"av":       "Avar",
			"awa":      "Awadhi",
			"ay":       "Aymara",
			"az":       "Azerbaijani",
			"ban":      "Balinese",
			"bal":      "Baluchi",
			"bm":       "Bambara",
			"bci":      "Baoulé",
			"ba":       "Bashkir",
			"eu":       "Basque",
			"btx":      "Batak Karo",
			"bts":      "Batak Simalungun",
			"bbc":      "Batak Toba",
			"be":       "Belarusian",
			"bem":      "Bemba",
			"bn":       "Bengali",
			"bew":      "Betawi",
			"bho":      "Bhojpuri",
			"bik":      "Bikol",
			"bs":       "Bosnian",
			"br":       "Breton",
			"bg":       "Bulgarian",
			"bua":      "Buryat",
			"yue":      "Cantonese",
			"ca":       "Catalan",
			"ceb":      "Cebuano",
			"ch":       "Chamorro",
			"ce":       "Chechen",
			"ny":       "Chichewa",
			"zh-CN":    "Chinese (Simplified)",
			"zh-TW":    "Chinese (Traditional)",
			"chk":      "Chuukese",
			"cv":       "Chuvash",
			"co":       "Corsican",
			"crh":      "Crimean Tatar (Cyrillic)",
			"crh-Latn": "Crimean Tatar (Latin)",
			"hr":       "Croatian",
			"cs":       "Czech",
			"da":       "Danish",
			"fa-AF":    "Dari",
			"dv":       "Dhivehi",
			"din":      "Dinka",
			"doi":      "Dogri",
			"dov":      "Dombe",
			"nl":       "Dutch",
			"dyu":      "Dyula",
			"dz":       "Dzongkha",
			"en":       "English",
			"eo":       "Esperanto",
			"et":       "Estonian",
			"ee":       "Ewe",
			"fo":       "Faroese",
			"fj":       "Fijian",
			"tl":       "Filipino",
			"fi":       "Finnish",
			"fon":      "Fon",
			"fr":       "French",
			"fr-CA":    "French (Canada)",
			"fy":       "Frisian",
			"fur":      "Friulian",
			"ff":       "Fulani",
			"gaa":      "Ga",
			"gl":       "Galician",
			"ka":       "Georgian",
			"de":       "German",
			"el":       "Greek",
			"gn":       "Guarani",
			"gu":       "Gujarati",
			"ht":       "Haitian Creole",
			"cnh":      "Hakha Chin",
			"ha":       "Hausa",
			"haw":      "Hawaiian",
			"iw":       "Hebrew",
			"hil":      "Hiligaynon",
			"hi":       "Hindi",
			"hmn":      "Hmong",
			"hu":       "Hungarian",
			"hrx":      "Hunsrik",
			"iba":      "Iban",
			"is":       "Icelandic",
			"ig":       "Igbo",
			"ilo":      "Ilocano",
			"id":       "Indonesian",
			"iu-Latn":  "Inuktut (Latin)",
			"iu":       "Inuktut (Syllabics)",
			"ga":       "Irish",
			"it":       "Italian",
			"jam":      "Jamaican Patois",
			"ja":       "Japanese",
			"jw":       "Javanese",
			"kac":      "Jingpo",
			"kl":       "Kalaallisut",
			"kn":       "Kannada",
			"kr":       "Kanuri",
			"pam":      "Kapampangan",
			"kk":       "Kazakh",
			"kha":      "Khasi",
			"km":       "Khmer",
			"cgg":      "Kiga",
			"kg":       "Kikongo",
			"rw":       "Kinyarwanda",
			"ktu":      "Kituba",
			"trp":      "Kokborok",
			"kv":       "Komi",
			"gom":      "Konkani",
			"ko":       "Korean",
			"kri":      "Krio",
			"ku":       "Kurdish (Kurmanji)",
			"ckb":      "Kurdish (Sorani)",
			"ky":       "Kyrgyz",
			"lo":       "Lao",
			"ltg":      "Latgalian",
			"la":       "Latin",
			"lv":       "Latvian",
			"lij":      "Ligurian",
			"li":       "Limburgish",
			"ln":       "Lingala",
			"lt":       "Lithuanian",
			"lmo":      "Lombard",
			"lg":       "Luganda",
			"luo":      "Luo",
			"lb":       "Luxembourgish",
			"mk":       "Macedonian",
			"mad":      "Madurese",
			"mai":      "Maithili",
			"mak":      "Makassar",
			"mg":       "Malagasy",
			"ms":       "Malay",
			"ms-Arab":  "Malay (Jawi)",
			"ml":       "Malayalam",
			"mt":       "Maltese",
			"mam":      "Mam",
			"gv":       "Manx",
			"mi":       "Maori",
			"mr":       "Marathi",
			"mh":       "Marshallese",
			"mwr":      "Marwadi",
			"mfe":      "Mauritian Creole",
			"chm":      "Meadow Mari",
			"mni-Mtei": "Meiteilon (Manipuri)",
			"min":      "Minang",
			"lus":      "Mizo",
			"mn":       "Mongolian",
			"my":       "Myanmar (Burmese)",
			"bm-Nkoo":  "NKo",
			"nhe":      "Nahuatl (Eastern Huasteca)",
			"ndc-ZW":   "Ndau",
			"nr":       "Ndebele (South)",
			"new":      "Nepalbhasa (Newari)",
			"ne":       "Nepali",
			"no":       "Norwegian",
			"nus":      "Nuer",
			"oc":       "Occitan",
			"or":       "Odia (Oriya)",
			"om":       "Oromo",
			"os":       "Ossetian",
			"pag":      "Pangasinan",
			"pap":      "Papiamento",
			"ps":       "Pashto",
			"fa":       "Persian",
			"pl":       "Polish",
			"pt":       "Portuguese (Brazil)",
			"pt-PT":    "Portuguese (Portugal)",
			"pa":       "Punjabi (Gurmukhi)",
			"pa-Arab":  "Punjabi (Shahmukhi)",
			"qu":       "Quechua",
			"kek":      "Qʼeqchiʼ",
			"rom":      "Romani",
			"ro":       "Romanian",
			"rn":       "Rundi",
			"ru":       "Russian",
			"se":       "Sami (North)",
			"sm":       "Samoan",
			"sg":       "Sango",
			"sa":       "Sanskrit",
			"sat-Latn": "Santali (Latin)",
			"sat":      "Santali (Ol Chiki)",
			"gd":       "Scots Gaelic",
			"nso":      "Sepedi",
			"sr":       "Serbian",
			"st":       "Sesotho",
			"crs":      "Seychellois Creole",
			"shn":      "Shan",
			"sn":       "Shona",
			"scn":      "Sicilian",
			"szl":      "Silesian",
			"sd":       "Sindhi",
			"si":       "Sinhala",
			"sk":       "Slovak",
			"sl":       "Slovenian",
			"so":       "Somali",
			"es":       "Spanish",
			"su":       "Sundanese",
			"sus":      "Susu",
			"sw":       "Swahili",
			"ss":       "Swati",
			"sv":       "Swedish",
			"ty":       "Tahitian",
			"tg":       "Tajik",
			"ber-Latn": "Tamazight",
			"ber":      "Tamazight (Tifinagh)",
			"ta":       "Tamil",
			"tt":       "Tatar",
			"te":       "Telugu",
			"tet":      "Tetum",
			"th":       "Thai",
			"bo":       "Tibetan",
			"ti":       "Tigrinya",
			"tiv":      "Tiv",
			"tpi":      "Tok Pisin",
			"to":       "Tongan",
			"lua":      "Tshiluba",
			"ts":       "Tsonga",
			"tn":       "Tswana",
			"tcy":      "Tulu",
			"tum":      "Tumbuka",
			"tr":       "Turkish",
			"tk":       "Turkmen",
			"tyv":      "Tuvan",
			"ak":       "Twi",
			"udm":      "Udmurt",
			"uk":       "Ukrainian",
			"ur":       "Urdu",
			"ug":       "Uyghur",
			"uz":       "Uzbek",
			"ve":       "Venda",
			"vec":      "Venetian",
			"vi":       "Vietnamese",
			"war":      "Waray",
			"cy":       "Welsh",
			"wo":       "Wolof",
			"xh":       "Xhosa",
			"sah":      "Yakut",
			"yi":       "Yiddish",
			"yo":       "Yoruba",
			"yua":      "Yucatec Maya",
			"zap":      "Zapotec",
			"zu":       "Zulu",
		}, nil
	default:
		return nil, fmt.Errorf("Invalid language type: %s", type_)
	}

	// var langsIndex int
	// switch type_ {
	// case "source":
	// 	langsIndex = 0

	// case "target":
	// 	langsIndex = 1

	// default:
	// 	return nil, fmt.Errorf("Invalid language type: %s", type_)
	// }

	// url_ := "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=n9wk7&rt=c"

	// req := []interface{}{[]interface{}{[]interface{}{"n9wk7", `["en"]`, nil, "generic"}}}

	// JSONString, _ := json.Marshal(req)

	// body := "f.req=" + url.QueryEscape(string(JSONString))

	// response, err := http.Post(url_, "application/x-www-form-urlencoded;charset=utf-8", bytes.NewBuffer([]byte(body)))
	// if err != nil {
	// 	return nil, err
	// }

	// defer response.Body.Close()

	// bodyBytes, err := ioutil.ReadAll(response.Body)
	// if err != nil {
	// 	return nil, err
	// }

	// responseTextList := regexp.MustCompile(`\n\d+\n(.*)\n\d+\n`).FindStringSubmatch(string(bodyBytes))
	// if len(responseTextList) < 2 {
	// 	return nil, fmt.Errorf("unexpected response from Google Translate")
	// }

	// var raw []interface{}
	// if err := json.Unmarshal([]byte(responseTextList[1]), &raw); err != nil {
	// 	return nil, err
	// }

	// var json_ []interface{}
	// if err := json.Unmarshal([]byte(raw[0].([]interface{})[2].(string)), &json_); err != nil {
	// 	return nil, err
	// }

	// var langs Language = make(Language)

	// for _, lang := range json_[langsIndex].([]interface{}) {
	// 	langs[lang.([]interface{})[0].(string)] = lang.([]interface{})[1].(string)
	// }

	// return langs, nil
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
