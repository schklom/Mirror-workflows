// Which language a profile that never picked one should be in (#303).
//
// A profile's language is a setting like any other and is synced with it, so "never chose" has
// to be a fact in the state rather than a guess: `lang: 'en'` is also what everybody who picked
// English has. `langAuto: true` marks a copy that started fresh on this build and has not had a
// language picked in Settings since. Copies older than it carry no mark and are left exactly as
// they are — including every existing profile whose `lang` is the old default.
//
// For a marked copy, the instance's DEFAULT_LANG (GET /api/config `default_lang`) comes first,
// then the first of the browser's languages this app speaks, then English.
import { LANGS } from './i18n-core.js'

const KEYS = Object.keys(LANGS)

/** A language tag ('pt-BR', 'pt_br', 'de-AT', 'en-US') as one of LANGS' keys, or null. */
export function matchLocale(tag) {
  if (typeof tag !== 'string') return null
  const want = tag.trim().replace(/_/g, '-').toLowerCase()
  if (!want) return null
  const exact = KEYS.find(k => k.toLowerCase() === want)
  if (exact) return exact
  const base = want.split('-')[0]
  return KEYS.includes(base) ? base : null
}

/** The language a copy that never chose one should be in, or null for a copy that chose. */
export function autoLang(S, config, navLangs = []) {
  if (!S || S.langAuto !== true) return null
  return matchLocale(config?.default_lang)
    || (navLangs || []).map(matchLocale).find(Boolean)
    || 'en'
}

export function browserLangs() {
  try {
    const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
    return list.filter(Boolean)
  } catch { return [] }
}
