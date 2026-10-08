import { afterEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import plNames from '../exercise-names/pl.js'
import { EXDB } from './exercises-data.js'
import {
  EXERCISE_NAME_LANGS, _setLangState, exerciseNameFor, exerciseNameSearchText
} from './i18n-core.js'

describe('Polish exercise names', () => {
  const source = JSON.parse(readFileSync(new URL('../../../scripts/exercise-name-sources/pl.json', import.meta.url), 'utf8'))
  afterEach(() => _setLangState('en', {}, null, null))

  test('matches the curated source and covers the complete built-in catalogue', () => {
    expect(Object.keys(plNames)).toHaveLength(EXDB.length)
    expect(plNames).toEqual(source)
    expect(EXERCISE_NAME_LANGS).toContain('pl')
  })

  test('contains a non-empty translation for every known exercise with no untranslated qualifiers', () => {
    for (const exercise of EXDB) {
      expect(plNames[exercise.id]?.trim(), exercise.id).toBeTruthy()
      expect(plNames[exercise.id], exercise.id).not.toMatch(
        /(?:^|[^\p{L}])(?:barbell|dumbbell|cable|band|stability ball|exercise ball|medicine ball|assisted|weighted)(?=$|[^\p{L}])/iu
      )
    }
  })

  test('preserves identity-changing qualifiers and equipment', () => {
    const rules = [
      [/assisted/iu, /asyst|wspomag/iu],
      [/weighted/iu, /obciąż/iu],
      [/(?:^|[^\p{L}])male(?=$|[^\p{L}])/iu, /mężczyzn/iu],
      [/(?:^|[^\p{L}])female(?=$|[^\p{L}])/iu, /kobiet/iu],
      [/barbell/iu, /sztang/iu],
      [/dumbbell/iu, /hantl/iu],
      [/kettlebell/iu, /kettlebell/iu],
      [/smith/iu, /smitha/iu],
      [/stability ball/iu, /pił[kc]\p{L}* gimnastyczn/iu],
      [/exercise ball/iu, /pił[kc]\p{L}* gimnastyczn/iu],
      [/medicine ball/iu, /pił[kc]\p{L}* lekarsk/iu],
      [/band/iu, /gum/iu],
      [/ez[- ]bar/iu, /łaman/iu],
      [/bosu/iu, /bosu/iu],
      [/trap bar/iu, /trap bar/iu],
    ]
    for (const exercise of EXDB) {
      for (const [english, polish] of rules) {
        if (english.test(exercise.n)) expect(plNames[exercise.id], `${exercise.id}: ${english}`).toMatch(polish)
      }
    }
  })

  test('gives different exercises different names', () => {
    const seen = new Map()
    for (const exercise of EXDB) {
      const name = plNames[exercise.id]
      const other = seen.get(name)
      if (other) expect(other.n, `${name}: ${other.id} vs ${exercise.id}`).toBe(exercise.n)
      else seen.set(name, exercise)
    }
  })

  test('shows Polish first and preserves the canonical English title', () => {
    const exercise = EXDB[0]
    _setLangState('pl', {}, null, plNames)
    expect(exerciseNameFor(exercise)).toBe(`${plNames[exercise.id]} (${exercise.n})`)
    expect(exerciseNameSearchText(exercise)).toContain(plNames[exercise.id])
    expect(exerciseNameSearchText(exercise)).toContain(exercise.n)
  })

  test('never translates custom exercises or changes other languages', () => {
    const custom = { id: 'custom-1', n: 'Moje ćwiczenie' }
    _setLangState('pl', {}, null, plNames)
    expect(exerciseNameFor(custom)).toBe('Moje ćwiczenie')
    _setLangState('en', {}, null, null)
    expect(exerciseNameFor(EXDB[0])).toBe(EXDB[0].n)
  })

  test('keeps loanword names without duplicating the English title', () => {
    const burpee = EXDB.find(e => e.id === '1160')
    _setLangState('pl', {}, null, plNames)
    expect(exerciseNameFor(burpee)).toBe('burpee')
  })

  test('can hide the English name in parentheses per language', () => {
    const exercise = EXDB[0]
    _setLangState('pl', {}, null, plNames, false)
    expect(exerciseNameFor(exercise)).toBe(plNames[exercise.id])
  })

  test('can replace the translation with the English name only, per language', () => {
    const exercise = EXDB[0]
    _setLangState('pl', {}, null, plNames, true, true)
    expect(exerciseNameFor(exercise)).toBe(exercise.n)
  })
})
