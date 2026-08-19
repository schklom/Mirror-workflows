import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import ptBR from '../instr/pt-BR.js'
import { EXDB } from './exercises-data.js'
import { INSTR_LANGS } from './i18n-core.js'

describe('Brazilian Portuguese exercise instructions', () => {
  const exercises = new Map(EXDB.map(exercise => [exercise.id, exercise]))
  const source = JSON.parse(readFileSync(new URL('../../../scripts/instruction-sources/pt-BR.json', import.meta.url), 'utf8'))

  test('starts with a reviewable translated batch', () => {
    expect(Object.keys(ptBR)).toHaveLength(20)
    expect(ptBR).toEqual(source)
  })

  test('only enables pt-BR instructions when the pack is complete', () => {
    expect(INSTR_LANGS.includes('pt-BR')).toBe(Object.keys(ptBR).length === EXDB.length)
  })

  test('contains only known exercises with complete, non-empty step lists', () => {
    for (const [id, steps] of Object.entries(ptBR)) {
      const exercise = exercises.get(id)
      expect(exercise, `unknown exercise ${id}`).toBeDefined()
      expect(steps, id).toHaveLength(exercise.st.length)
      steps.forEach((step, index) => {
        expect(step.trim(), `${id} step ${index + 1}`).not.toBe('')
        expect(step, `${id} step ${index + 1}`).not.toBe(exercise.st[index])
        expect(step, `${id} step ${index + 1}`).not.toMatch(/\b(the|your|with|towards|repeat|desired)\b/i)
        expect(step, `${id} step ${index + 1}`).not.toMatch(/(?:^|[^\p{L}])(?:ginásio|anca|abdómen|gémeos|ecrã)(?=$|[^\p{L}])/iu)
      })
    }
  })
})
