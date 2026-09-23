import { describe, it, expect } from 'vitest'
import {
  LANGS, INSTR_LANGS, EXERCISE_NAME_LANGS, DATE_LOCALES, DERIVED_LOCALES,
  baseLang, derivePack, dateLocale, getLang, t, _setLangState, exerciseNameClass, exerciseNameFor
} from './i18n-core.js'
import { EXDB } from './exercises-data.js'
import de from '../locales/de.js'

describe('baseLang', () => {
  it('maps a derived locale to the language whose packs it loads', () => {
    expect(baseLang('de-CH')).toBe('de')
  })

  it('leaves every other language as itself', () => {
    expect(baseLang('de')).toBe('de')
    expect(baseLang('pt-BR')).toBe('pt-BR')
    expect(baseLang('en')).toBe('en')
    expect(baseLang('nonsense')).toBe('nonsense')
  })

  it('keeps derived locales in step with their base for instructions and names', () => {
    // The membership tests run on the base, so de-CH gains instruction and exercise-name packs
    // exactly when de does — there is no second list entry to remember.
    expect(INSTR_LANGS.includes(baseLang('de-CH'))).toBe(INSTR_LANGS.includes('de'))
    expect(EXERCISE_NAME_LANGS.includes(baseLang('de-CH'))).toBe(EXERCISE_NAME_LANGS.includes('de'))
  })
})

describe('derivePack', () => {
  it('rewrites ß as ss for Swiss German', () => {
    expect(derivePack('de-CH', { a: 'Gesäß', b: 'Füße', c: 'schließen' }))
      .toEqual({ a: 'Gesäss', b: 'Füsse', c: 'schliessen' })
  })

  it('leaves legitimate ss alone', () => {
    expect(derivePack('de-CH', { a: 'Arbeitssätze', b: 'Schlüssel', c: 'Latissimus' }))
      .toEqual({ a: 'Arbeitssätze', b: 'Schlüssel', c: 'Latissimus' })
  })

  it('walks instruction packs, which nest steps in arrays', () => {
    expect(derivePack('de-CH', { '0007': ['Setz dich aufs Gerät.', 'Spann das Gesäß an.'] }))
      .toEqual({ '0007': ['Setz dich aufs Gerät.', 'Spann das Gesäss an.'] })
  })

  it('returns the pack untouched for a language that is not derived', () => {
    const pack = { a: 'Gesäß' }
    expect(derivePack('de', pack)).toBe(pack)
    expect(derivePack('en', pack)).toBe(pack)
  })

  it('passes a null pack through', () => {
    expect(derivePack('de-CH', null)).toBe(null)
  })

  it('derives the whole German locale with no ß left and no key lost', () => {
    // Control: the test is only meaningful while de itself still contains ß.
    expect(Object.values(de).some(v => /ß/.test(v))).toBe(true)

    const swiss = derivePack('de-CH', de)
    expect(Object.keys(swiss)).toEqual(Object.keys(de))
    expect(Object.values(swiss).filter(v => /ß/.test(v))).toEqual([])
    expect(swiss.glutes).toBe('Gesäss')
    // Only the ß values move; everything else is identical to the German pack.
    const changed = Object.keys(de).filter(k => de[k] !== swiss[k])
    expect(changed.every(k => /ß/.test(de[k]))).toBe(true)
  })
})

describe('de-CH as a selectable language', () => {
  it('is offered in the picker and formats numbers Swiss-style', () => {
    expect(LANGS['de-CH']).toBeTruthy()
    expect(DATE_LOCALES['de-CH']).toBe('de-CH')
    // The reason de-CH is worth having at all: German formatting gets the weights wrong here.
    // ICU writes the Swiss group separator as ' or ’ depending on its version; both are Swiss.
    expect(new Intl.NumberFormat(DATE_LOCALES['de-CH']).format(1234.5)).toMatch(/^1['’]234\.5$/)
    expect(new Intl.NumberFormat(DATE_LOCALES.de).format(1234.5)).toBe('1.234,5')
  })

  it('stays the active language rather than collapsing to its base', () => {
    _setLangState('de-CH', derivePack('de-CH', de), null, null)
    expect(getLang()).toBe('de-CH')
    expect(dateLocale()).toBe('de-CH')
    expect(t('glutes')).toBe('Gesäss')
    _setLangState('en', {}, null, null)
  })

  it('ships no locale pack of its own, so nothing can shadow the derivation', () => {
    const packs = import.meta.glob('../locales/*.js', { eager: true, import: 'default' })
    for (const code of Object.keys(DERIVED_LOCALES)) {
      expect(packs[`../locales/${code}.js`], `${code} is derived and must not have a pack`).toBeUndefined()
    }
    // Control: a language that is not derived does have one.
    expect(packs['../locales/de.js']).toBeTruthy()
  })

  it('declares de as its base, not the other way round', () => {
    // ss → ß is not mechanical (Maße and Masse both collapse to Masse), so the German pack
    // must never be generated from the Swiss one.
    expect(DERIVED_LOCALES['de-CH'].base).toBe('de')
    expect(DERIVED_LOCALES.de).toBeUndefined()
  })
})

// EXDB stores English names lower-case and the UI title-cases them with CSS. A translated pack
// brings its own casing, and applying capitalize on top of it produced "Bankdrücken Mit
// Langhantel" in German and "Has" for Hungarian common nouns.
describe('exerciseNameClass', () => {
  const bench = { id: '0025', n: 'barbell bench press' }
  const pushUp = { id: '0662', n: 'push-up' }
  const custom = { id: 'custom-1', n: 'my own press' }

  it('title-cases only while the English fallback is showing', () => {
    _setLangState('en', {}, null, null)
    expect(exerciseNameClass(bench)).toBe('capitalize')
    _setLangState('de', {}, null, null)
    expect(exerciseNameClass(bench)).toBe('capitalize')
    _setLangState('de', {}, null, { '0025': 'Bankdrücken mit Langhantel' })
    expect(exerciseNameClass(bench)).toBe('')
    _setLangState('en', {}, null, null)
    expect(exerciseNameClass(bench)).toBe('capitalize')
  })

  // German covers the equipment exercises and not the body-weight ones: an exercise the pack
  // has no entry for shows its lower-case English title and still needs the casing.
  it('decides per exercise, so an untranslated one in a partial pack keeps its casing', () => {
    _setLangState('de', {}, null, { '0025': 'Bankdrücken mit Langhantel' })
    expect(exerciseNameClass(bench)).toBe('')
    expect(exerciseNameClass(pushUp)).toBe('capitalize')
    expect(exerciseNameClass(custom)).toBe('capitalize')
    expect(exerciseNameClass(undefined)).toBe('capitalize')
    _setLangState('en', {}, null, null)
  })
})

// The two per-language switches in Settings (the English name in parentheses, English names
// only) came with the Italian and French packs, but they have to hold for every pack the app
// ships — German too, which covers only part of the catalogue.
describe('English-name switches with every exercise-name pack', () => {
  const packs = import.meta.glob('../exercise-names/*.js', { eager: true, import: 'default' })
  const packFor = lang => packs[`../exercise-names/${lang}.js`]

  it('ships a pack for every language listed as having one', () => {
    for (const lang of EXERCISE_NAME_LANGS) expect(packFor(lang), lang).toBeTruthy()
  })

  for (const lang of EXERCISE_NAME_LANGS) {
    it(`${lang}: parentheses off shows the translation alone, English only shows the English title`, () => {
      const names = packFor(lang)
      const ex = EXDB.find(e => names[e.id] && names[e.id].toLocaleLowerCase(lang) !== e.n.toLocaleLowerCase('en'))
      expect(ex, lang).toBeTruthy()
      _setLangState(lang, {}, null, names)
      expect(exerciseNameFor(ex)).toBe(`${names[ex.id]} (${ex.n})`)
      expect(exerciseNameClass(ex)).toBe('')
      _setLangState(lang, {}, null, names, false)
      expect(exerciseNameFor(ex)).toBe(names[ex.id])
      expect(exerciseNameClass(ex)).toBe('')
      _setLangState(lang, {}, null, names, true, true)
      expect(exerciseNameFor(ex)).toBe(ex.n)
      // The English title is stored lower-case, so it gets the title-casing back with it.
      expect(exerciseNameClass(ex)).toBe('capitalize')
      _setLangState('en', {}, null, null)
    })
  }

  it('de: an exercise the partial pack does not cover is unaffected by either switch', () => {
    const names = packFor('de')
    const ex = EXDB.find(e => !names[e.id])
    for (const [showEn, enOnly] of [[true, false], [false, false], [true, true]]) {
      _setLangState('de', {}, null, names, showEn, enOnly)
      expect(exerciseNameFor(ex)).toBe(ex.n)
      expect(exerciseNameClass(ex)).toBe('capitalize')
    }
    _setLangState('en', {}, null, null)
  })
})
