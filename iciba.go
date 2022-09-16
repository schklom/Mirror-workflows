package simplytranslate_engines

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

// ICIBAEngine is an engine that fetches data from https://www.iciba.com.
type ICIBAEngine struct{}

func (_ *ICIBAEngine) InternalName() string { return "iciba" }

func (_ *ICIBAEngine) DisplayName() string { return "iCIBA" }

var icibaLanguages = []Language{
	// ICIBA does have an API, but they return Chinese names.
	// For languages already present in Google translate, the English
	// names in that engine file are used; Otherwise official names
	// as researched on Wikipedia are used. They're validated against
	// the Chinese names to the best of my ability.
	// Missing "cni", "kbh", "tmh"
	// due to conflict between ISO-639 table and Chinese label
	// one "//" means on iciba but not on google
	{Name: "Achinese", Code: "ace"},       //
	{Name: "Achuar-Shiwiar", Code: "acu"}, //
	{Name: "Afrikaans", Code: "af"},
	{Name: "Aguaruna", Code: "agr"}, //
	{Name: "Akawaio", Code: "ake"},  //
	{Name: "Albanian", Code: "sq"},
	{Name: "Amharic", Code: "am"},
	{Name: "Arabic", Code: "ar"},
	{Name: "Armenian", Code: "hy"},
	{Name: "Azerbaijani", Code: "az"},
	{Name: "Barasana-Eduria", Code: "bsn"}, //
	{Name: "Bashkir", Code: "ba"},          //
	{Name: "Basque", Code: "eu"},
	{Name: "Belarusian", Code: "be"},
	{Name: "Bemba", Code: "bem"}, //
	{Name: "Bengali", Code: "bn"},
	{Name: "Berber", Code: "ber"}, //
	{Name: "Bislama", Code: "bi"}, //
	{Name: "Bosnian", Code: "bs"},
	{Name: "Breton", Code: "br"}, //
	{Name: "Bulgarian", Code: "bg"},
	{Name: "Cabécar", Code: "cjp"}, //
	{Name: "Cantonese", Code: "yue"},
	{Name: "Catalan", Code: "ca"},
	{Name: "Cebuano", Code: "ceb"},
	{Name: "Chamorro", Code: "cha"}, //
	{Name: "Cherokee", Code: "chr"}, //
	{Name: "Chichewa", Code: "ny"},
	{Name: "Chinese (Simplified)", Code: "zh"},   // "zh-cn" on Google
	{Name: "Chinese (Traditional)", Code: "cht"}, // "zh-tw" on Google
	{Name: "Chuvash", Code: "cv"},
	{Name: "Coptic", Code: "cop"}, //
	{Name: "Corsican", Code: "co"},
	{Name: "Croatian", Code: "hr"},
	{Name: "Czech", Code: "cs"},
	{Name: "Danish", Code: "da"},
	{Name: "Dhivehi", Code: "dv"}, //
	{Name: "Dinka", Code: "dik"},  //
	{Name: "Dutch", Code: "nl"},
	{Name: "Dzongkha", Code: "dz"}, //
	{Name: "English", Code: "en"},
	{Name: "Esperanto", Code: "eo"},
	{Name: "Estonian", Code: "et"},
	{Name: "Ewe", Code: "ee"},       //
	{Name: "Faroese", Code: "fo"},   //
	{Name: "Fijian", Code: "fj"},    //
	{Name: "Filipino", Code: "fil"}, // "tl" on Google
	{Name: "Finnish", Code: "fi"},
	{Name: "French", Code: "fr"},
	{Name: "Frisian", Code: "fy"},
	{Name: "Galela", Code: "gbi"}, //
	{Name: "Galician", Code: "gl"},
	{Name: "Ganda", Code: "lg"},    //
	{Name: "Georgian", Code: "jy"}, // "ka" on Google
	{Name: "German", Code: "de"},
	{Name: "Greek", Code: "el"},
	{Name: "Guerrero Amuzgo", Code: "amu"}, //
	{Name: "Gujarati", Code: "gu"},
	{Name: "Haitian Creole", Code: "ht"},
	{Name: "Hausa", Code: "ha"},
	{Name: "Hawaiian", Code: "haw"},
	{Name: "Hebrew", Code: "he"}, // "iw" on Google
	{Name: "Hindi", Code: "hi"},
	{Name: "Hmong Daw", Code: "mww"}, //
	{Name: "Hmong", Code: "hmn"},     // not in iciba
	{Name: "Hungarian", Code: "hu"},
	{Name: "Icelandic", Code: "is"},
	{Name: "Igbo", Code: "ig"},
	{Name: "Indonesian", Code: "id"},
	{Name: "Irish", Code: "ga"},
	{Name: "Italian", Code: "it"},
	{Name: "Jacalteco", Code: "jac"}, //
	{Name: "Japanese", Code: "ja"},
	{Name: "Javanese", Code: "jv"}, // "jw" on Google
	{Name: "Kabyle", Code: "kab"},  //
	{Name: "Kannada", Code: "kn"},
	{Name: "Kaqchikel", Code: "cak"},        //
	{Name: "Kazakh", Code: "ka"},            // Google only has "kk"
	{Name: "Kazakh (Cyrillic)", Code: "kk"}, // Google has it as just "Kazakh"
	{Name: "Kekchí", Code: "kek"},           //
	{Name: "Khmer", Code: "km"},
	{Name: "Kinyarwanda", Code: "rw"},
	{Name: "Kongo", Code: "kg"}, //
	{Name: "Korean", Code: "ko"},
	{Name: "Kurdish (Kurmanji)", Code: "ku"},
	{Name: "Kyrgyz", Code: "ky"},
	{Name: "Lao", Code: "lo"},
	{Name: "Latin", Code: "la"},
	{Name: "Latvian", Code: "lv"},
	{Name: "Lingala", Code: "ln"}, //
	{Name: "Lithuanian", Code: "lt"},
	{Name: "Lukpa", Code: "dop"}, //
	{Name: "Luxembourgish", Code: "lb"},
	{Name: "Macedonian", Code: "mk"},
	{Name: "Malagasy", Code: "mg"},
	{Name: "Malay", Code: "ms"},
	{Name: "Malayalam", Code: "ml"},
	{Name: "Maltese", Code: "mt"},
	{Name: "Mam", Code: "mam"}, //
	{Name: "Manx", Code: "gv"}, //
	{Name: "Maori", Code: "mi"},
	{Name: "Marathi", Code: "mr"},
	{Name: "Mari (Eastern)", Code: "mhr"}, //
	{Name: "Mari (Western)", Code: "mrj"}, //
	{Name: "Mongolian", Code: "mn"},
	{Name: "Montenegrin", Code: "me"}, //
	{Name: "Myanmar (Burmese)", Code: "my"},
	{Name: "Nahuatl", Code: "nhg"}, //
	{Name: "Ndyuka", Code: "djk"},  //
	{Name: "Nepali", Code: "ne"},
	{Name: "Norwegian", Code: "no"},
	{Name: "Odia (Oriya)", Code: "or"},
	{Name: "Ojibwa", Code: "ojb"},
	{Name: "Oromo", Code: "om"},       //
	{Name: "Ossetian", Code: "os"},    //
	{Name: "Paite", Code: "pck"},      //
	{Name: "Papiamento", Code: "pap"}, //
	{Name: "Pashto", Code: "ps"},
	{Name: "Persian", Code: "fa"},
	{Name: "Polish", Code: "pl"},
	{Name: "Portuguese", Code: "pt"},
	{Name: "Potawatomi", Code: "pot"}, //
	{Name: "Punjabi", Code: "pa"},
	{Name: "Querétaro Otomi", Code: "otq"},     //
	{Name: "Quiché", Code: "quc"},              //
	{Name: "Quichua", Code: "quw"},             //
	{Name: "Quiotepec Chinantec", Code: "chq"}, //
	{Name: "Romani", Code: "rmn"},              //
	{Name: "Romanian", Code: "ro"},
	{Name: "Rundi", Code: "rn"}, //
	{Name: "Russian", Code: "ru"},
	{Name: "Samoan", Code: "sm"},
	{Name: "Sango", Code: "sg"}, //
	{Name: "Scots Gaelic", Code: "gd"},
	{Name: "Serbian", Code: "sr"},
	{Name: "Seselwa Creole French", Code: "crs"}, //
	{Name: "Sesotho", Code: "st"},
	{Name: "Shona", Code: "sn"},
	{Name: "Shuar", Code: "jiv"}, //
	{Name: "Sindhi", Code: "sd"},
	{Name: "Sinhala", Code: "si"},
	{Name: "Slovak", Code: "sk"},
	{Name: "Slovenian", Code: "sl"},
	{Name: "Somali", Code: "so"},
	{Name: "Spanish", Code: "es"},
	{Name: "Sundanese", Code: "su"},
	{Name: "Swahili", Code: "sw"},
	{Name: "Swedish", Code: "sv"},
	{Name: "Syriac", Code: "syc"},    // considered "extinct" but is somehow supported
	{Name: "Tachelhit", Code: "shi"}, //
	{Name: "Tahitian", Code: "ty"},   //
	{Name: "Tajik", Code: "tg"},
	{Name: "Tamil", Code: "ta"},
	{Name: "Tatar", Code: "tt"},
	{Name: "Telugu", Code: "te"},
	{Name: "Tetum", Code: "tet"}, //
	{Name: "Thai", Code: "th"},
	{Name: "Tigre", Code: "ti"},      //
	{Name: "Tiwi", Code: "tw"},       //
	{Name: "Tok Pisin", Code: "tpi"}, //
	{Name: "Tonga", Code: "to"},      //
	{Name: "Tsonga", Code: "ts"},
	{Name: "Tswana", Code: "tn"}, //
	{Name: "Turkish", Code: "tr"},
	{Name: "Turkmen", Code: "tk"},
	{Name: "Udmurt", Code: "udm"}, //
	{Name: "Ukrainian", Code: "uk"},
	{Name: "Uma", Code: "ppk"}, //
	{Name: "Urdu", Code: "ur"},
	{Name: "Uspanteco", Code: "usp"}, //
	{Name: "Uyghur", Code: "uy"},     // "ug" on Google
	{Name: "Uzbek", Code: "uz"},
	{Name: "Venda", Code: "ve"}, //
	{Name: "Vietnamese", Code: "vi"},
	{Name: "Waray", Code: "war"}, //
	{Name: "Welsh", Code: "cy"},
	{Name: "Wolaitta", Code: "wal"}, //
	{Name: "Wolof", Code: "wol"},
	{Name: "Xhosa", Code: "xh"},
	{Name: "Yiddish", Code: "yi"},
	{Name: "Yoruba", Code: "yo"},
	{Name: "Yucatán Maya", Code: "yua"}, //
	{Name: "Zarma", Code: "dje"},        //
	{Name: "Zulu", Code: "zu"},
}

func (_ *ICIBAEngine) SourceLanguages() ([]Language, error) { return icibaLanguages, nil }

func (_ *ICIBAEngine) TargetLanguages() ([]Language, error) { return icibaLanguages, nil }

func (_ *ICIBAEngine) SupportsAutodetect() bool { return true }

func (_ *ICIBAEngine) DetectLanguage(text string) (Language, error) { return Language{}, nil }

type icibaTranslateResponse struct {
	Content struct {
		From string `json:"from"`
		Out  string `json:"out"`
	} `json:"content"`
}

func (_ *ICIBAEngine) Translate(text string, from Language, to Language) (TranslationResult, error) {
	requestURL, err := url.Parse("https://ifanyi.iciba.com/index.php")

	if err != nil {
		// The URL is constant, so it should never fail.
		panic(err)
	}

	query := url.Values{}
	query.Add("c", "trans")
	query.Add("m", "fy")
	query.Add("client", "6")
	query.Add("auth_user", "key_web_fanyi")

	sum := md5.Sum([]byte(("6key_web_fanyiifanyiweb8hc9s98e" + text)))

	query.Add("sign", hex.EncodeToString(sum[:])[:16])

	requestURL.RawQuery = query.Encode()

	formData := url.Values{}
	formData.Add("from", from.Code)
	formData.Add("to", to.Code)
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

	var sourceLanguage Language

	for _, lang := range icibaLanguages {
		if lang.Code == responseJSON.Content.From {
			sourceLanguage = lang
			break
		}
	}

	if sourceLanguage == (Language{}) {
		return TranslationResult{SourceLanguage: from, TranslatedText: responseJSON.Content.Out},
			fmt.Errorf("language code \"%s\" is not in iCIBA's language list", responseJSON.Content.From)
	}

	return TranslationResult{
		SourceLanguage: sourceLanguage,
		TranslatedText: responseJSON.Content.Out,
	}, nil
}
