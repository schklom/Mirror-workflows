package engines

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

// ICIBA is an engine that fetches data from https://www.iciba.com.
type ICIBA struct{}

func (_ *ICIBA) InternalName() string { return "iciba" }

func (_ *ICIBA) DisplayName() string { return "iCIBA" }

var icibaLanguages = Language{
	// ICIBA does have an API, but they return Chinese names.
	// For languages already present in Google translate, the English
	// names in that engine file are used; Otherwise official names
	// as researched on Wikipedia are used. They're validated against
	// the Chinese names to the best of my ability.
	// Missing "cni", "kbh", "tmh"
	// due to conflict between ISO-639 table and Chinese label
	// one "//" means on iciba but not on google
	"ace": "Achinese",       //
	"acu": "Achuar-Shiwiar", //
	"af":  "Afrikaans",
	"agr": "Aguaruna", //
	"ake": "Akawaio",  //
	"sq":  "Albanian",
	"am":  "Amharic",
	"ar":  "Arabic",
	"hy":  "Armenian",
	"az":  "Azerbaijani",
	"bsn": "Barasana-Eduria", //
	"ba":  "Bashkir",         //
	"eu":  "Basque",
	"be":  "Belarusian",
	"bem": "Bemba", //
	"bn":  "Bengali",
	"ber": "Berber",  //
	"bi":  "Bislama", //
	"bs":  "Bosnian",
	"br":  "Breton", //
	"bg":  "Bulgarian",
	"cjp": "Cabécar", //
	"yue": "Cantonese",
	"ca":  "Catalan",
	"ceb": "Cebuano",
	"cha": "Chamorro", //
	"chr": "Cherokee", //
	"ny":  "Chichewa",
	"zh":  "Chinese (Simplified)",  // "zh-cn" on Google
	"cht": "Chinese (Traditional)", // "zh-tw" on Google
	"cv":  "Chuvash",
	"cop": "Coptic", //
	"co":  "Corsican",
	"hr":  "Croatian",
	"cs":  "Czech",
	"da":  "Danish",
	"dv":  "Dhivehi", //
	"dik": "Dinka",   //
	"nl":  "Dutch",
	"dz":  "Dzongkha", //
	"en":  "English",
	"eo":  "Esperanto",
	"et":  "Estonian",
	"ee":  "Ewe",      //
	"fo":  "Faroese",  //
	"fj":  "Fijian",   //
	"fil": "Filipino", // "tl" on Google
	"fi":  "Finnish",
	"fr":  "French",
	"fy":  "Frisian",
	"gbi": "Galela", //
	"gl":  "Galician",
	"lg":  "Ganda",    //
	"jy":  "Georgian", // "ka" on Google
	"de":  "German",
	"el":  "Greek",
	"amu": "Guerrero Amuzgo", //
	"gu":  "Gujarati",
	"ht":  "Haitian Creole",
	"ha":  "Hausa",
	"haw": "Hawaiian",
	"he":  "Hebrew", // "iw" on Google
	"hi":  "Hindi",
	"mww": "Hmong Daw", //
	"hmn": "Hmong",     // not in iciba
	"hu":  "Hungarian",
	"is":  "Icelandic",
	"ig":  "Igbo",
	"id":  "Indonesian",
	"ga":  "Irish",
	"it":  "Italian",
	"jac": "Jacalteco", //
	"ja":  "Japanese",
	"jv":  "Javanese", // "jw" on Google
	"kab": "Kabyle",   //
	"kn":  "Kannada",
	"cak": "Kaqchikel",         //
	"ka":  "Kazakh",            // Google only has "kk"
	"kk":  "Kazakh (Cyrillic)", // Google has it as just "Kazakh"
	"kek": "Kekchí",            //
	"km":  "Khmer",
	"rw":  "Kinyarwanda",
	"kg":  "Kongo", //
	"ko":  "Korean",
	"ku":  "Kurdish (Kurmanji)",
	"ky":  "Kyrgyz",
	"lo":  "Lao",
	"la":  "Latin",
	"lv":  "Latvian",
	"ln":  "Lingala", //
	"lt":  "Lithuanian",
	"dop": "Lukpa", //
	"lb":  "Luxembourgish",
	"mk":  "Macedonian",
	"mg":  "Malagasy",
	"ms":  "Malay",
	"ml":  "Malayalam",
	"mt":  "Maltese",
	"mam": "Mam",  //
	"gv":  "Manx", //
	"mi":  "Maori",
	"mr":  "Marathi",
	"mhr": "Mari (Eastern)", //
	"mrj": "Mari (Western)", //
	"mn":  "Mongolian",
	"me":  "Montenegrin", //
	"my":  "Myanmar (Burmese)",
	"nhg": "Nahuatl", //
	"djk": "Ndyuka",  //
	"ne":  "Nepali",
	"no":  "Norwegian",
	"or":  "Odia (Oriya)",
	"ojb": "Ojibwa",
	"om":  "Oromo",      //
	"os":  "Ossetian",   //
	"pck": "Paite",      //
	"pap": "Papiamento", //
	"ps":  "Pashto",
	"fa":  "Persian",
	"pl":  "Polish",
	"pt":  "Portuguese",
	"pot": "Potawatomi", //
	"pa":  "Punjabi",
	"otq": "Querétaro Otomi",     //
	"quc": "Quiché",              //
	"quw": "Quichua",             //
	"chq": "Quiotepec Chinantec", //
	"rmn": "Romani",              //
	"ro":  "Romanian",
	"rn":  "Rundi", //
	"ru":  "Russian",
	"sm":  "Samoan",
	"sg":  "Sango", //
	"gd":  "Scots Gaelic",
	"sr":  "Serbian",
	"crs": "Seselwa Creole French", //
	"st":  "Sesotho",
	"sn":  "Shona",
	"jiv": "Shuar", //
	"sd":  "Sindhi",
	"si":  "Sinhala",
	"sk":  "Slovak",
	"sl":  "Slovenian",
	"so":  "Somali",
	"es":  "Spanish",
	"su":  "Sundanese",
	"sw":  "Swahili",
	"sv":  "Swedish",
	"syc": "Syriac",    // considered "extinct" but is somehow supported
	"shi": "Tachelhit", //
	"ty":  "Tahitian",  //
	"tg":  "Tajik",
	"ta":  "Tamil",
	"tt":  "Tatar",
	"te":  "Telugu",
	"tet": "Tetum", //
	"th":  "Thai",
	"ti":  "Tigre",     //
	"tw":  "Tiwi",      //
	"tpi": "Tok Pisin", //
	"to":  "Tonga",     //
	"ts":  "Tsonga",
	"tn":  "Tswana", //
	"tr":  "Turkish",
	"tk":  "Turkmen",
	"udm": "Udmurt", //
	"uk":  "Ukrainian",
	"ppk": "Uma", //
	"ur":  "Urdu",
	"usp": "Uspanteco", //
	"uy":  "Uyghur",    // "ug" on Google
	"uz":  "Uzbek",
	"ve":  "Venda", //
	"vi":  "Vietnamese",
	"war": "Waray", //
	"cy":  "Welsh",
	"wal": "Wolaitta", //
	"wol": "Wolof",
	"xh":  "Xhosa",
	"yi":  "Yiddish",
	"yo":  "Yoruba",
	"yua": "Yucatán Maya", //
	"dje": "Zarma",        //
	"zu":  "Zulu",
}

func (_ *ICIBA) SourceLanguages() (Language, error) { return icibaLanguages, nil }

func (_ *ICIBA) TargetLanguages() (Language, error) { return icibaLanguages, nil }

func (_ *ICIBA) DetectLanguage(text string) (string, error) { return "", nil }

type icibaTranslateResponse struct {
	Content struct {
		From string `json:"from"`
		Out  string `json:"out"`
	} `json:"content"`
}

func (_ *ICIBA) Translate(text string, from, to string) (TranslationResult, error) {
	requestURL, _ := url.Parse("https://ifanyi.iciba.com/index.php")

	query := url.Values{}
	query.Add("c", "trans")
	query.Add("m", "fy")
	query.Add("client", "6")
	query.Add("auth_user", "key_web_fanyi")

	sum := md5.Sum([]byte(("6key_web_fanyiifanyiweb8hc9s98e" + text)))
	query.Add("sign", hex.EncodeToString(sum[:])[:16])

	requestURL.RawQuery = query.Encode()

	formData := url.Values{}
	formData.Add("from", from)
	formData.Add("to", to)
	formData.Add("q", text)

	response, err := http.PostForm(requestURL.String(), formData)
	if err != nil {
		return TranslationResult{}, err
	}

	defer response.Body.Close()

	if response.StatusCode != 200 {
		return TranslationResult{}, fmt.Errorf("got status code %d from iCIBA", response.StatusCode)
	}

	var responseJSON icibaTranslateResponse

	if err := json.NewDecoder(response.Body).Decode(&responseJSON); err != nil {
		return TranslationResult{}, err
	}

	var sourceLanguage string

	for code := range icibaLanguages {
		if code == responseJSON.Content.From {
			sourceLanguage = code
			break
		}
	}

	if sourceLanguage == "" {
		return TranslationResult{TranslatedText: responseJSON.Content.Out},
			fmt.Errorf("language code \"%s\" is not in iCIBA's language list", responseJSON.Content.From)
	}

	return TranslationResult{
		SourceLanguage: sourceLanguage,
		TranslatedText: responseJSON.Content.Out,
	}, nil
}

func (_ *ICIBA) Tts(text, lang string) (string, error) { return "", nil }
