// Pure, runtime-agnostic core of the i18n module.
//
// Split out of i18n.js so the pure-function training helpers (format.js, exercises.js and
// everything they import transitively — history, progression, onerm, muscles, demoSeed) can
// be required from plain Node too. That reuse is what lets the MCP server compute 1RM, muscle
// balance and progression prescriptions without re-implementing them — the same code that
// produces the numbers shown in the UI produces the numbers an LLM answers with.
//
// Everything browser-specific (React subscription hook, Vite's import.meta.glob lazy-loads of
// locale packs) stays in i18n.js, which re-exports these readers verbatim.

export const LANGS = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  pt: 'Português', pl: 'Polski', tr: 'Türkçe', ru: 'Русский', zh: '中文',
  ko: '한국어', hi: 'हिन्दी'
}
export const INSTR_LANGS = ['en', 'es', 'fr', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko']
export const DATE_LOCALES = {
  en: 'en-GB', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT',
  pl: 'pl-PL', tr: 'tr-TR', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', hi: 'hi-IN'
}

// Mutable module state. `lang`/`dict`/`instr` are the readers' inputs; the browser-side
// `setLang` (in i18n.js) is the only writer, so they stay private to this module.
let lang = 'en'
let dict = {}
let instr = null            // { exId: [steps] } for the current language, null = English
let version = 0

export const getLang = () => lang
export const dateLocale = () => DATE_LOCALES[lang] || 'en-GB'
export const getVersion = () => version

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}

// Instructions for an exercise in the current language (English steps as fallback).
export const instrFor = ex => (instr && instr[ex.id]) || ex.st || []

/**
 * Internal setter invoked by i18n.js's `setLang` once the locale pack has been loaded.
 * Kept here — rather than just exported as `setLang` — because loading packs requires
 * Vite's `import.meta.glob`, which would drag this file straight back into not being
 * Node-safe. Returns the new version so the caller can notify its React subscribers.
 *
 * Both `dict` and `instr` may be passed as `null` to reset to English.
 */
export function _setLangState(newLang, newDict, newInstr) {
  lang = LANGS[newLang] ? newLang : 'en'
  dict = lang === 'en' ? {} : (newDict || {})
  instr = lang === 'en' || !INSTR_LANGS.includes(lang) ? null : (newInstr || null)
  version++
  return version
}
