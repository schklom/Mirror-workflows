// Browser-only shell of the i18n module.
//
// Pure state, constants and readers (t, dateLocale, instrFor, getLang, LANGS, INSTR_LANGS)
// live in i18n-core.js so plain Node can reuse the training logic without a Vite environment.
// This file adds the two pieces that genuinely need the browser: the async `setLang` (which
// lazy-loads locale packs via import.meta.glob) and the React subscription hook `useLang`
// (which re-renders components on language switch).

import { useSyncExternalStore } from 'react'
import {
  LANGS, INSTR_LANGS, DATE_LOCALES,
  getLang, dateLocale, t, instrFor, getVersion, _setLangState
} from './i18n-core.js'

// Re-export everything verbatim so existing callers (`import { t } from '../lib/i18n.js'`)
// keep working unchanged — the split is invisible at the import site.
export { LANGS, INSTR_LANGS, DATE_LOCALES, getLang, dateLocale, t, instrFor }

// Vite code-splits each locale pack into its own chunk via import.meta.glob; instructions use
// the same mechanism in src/instr/. Both are lazy, so the production bundle ships English only.
const localePacks = import.meta.glob('../locales/*.js')
const instrPacks = import.meta.glob('../instr/*.js')

// React subscription bookkeeping — kept here, not in core, so core has zero React coupling.
const subs = new Set()
const notify = () => { subs.forEach(f => f()) }

export async function setLang(l) {
  if (!LANGS[l]) l = 'en'
  // _setLangState mutates core state and bumps the version; we read it back for the
  // subscription selector below.
  if (l === getLang() && getVersion() > 0) return
  let dict = {}, instr = null
  try {
    dict = l === 'en' ? {} : (await localePacks['../locales/' + l + '.js']()).default
    instr = l === 'en' || !INSTR_LANGS.includes(l) ? null : (await instrPacks['../instr/' + l + '.js']()).default
  } catch (e) { dict = {}; instr = null }
  _setLangState(l, dict, instr)
  notify()
}

// Re-renders the subscribing component (and its children) whenever the language changes.
export function useLang() {
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, getVersion)
}
