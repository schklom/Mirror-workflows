import { describe, expect, test } from 'vitest'
import pt from '../locales/pt.js'
import ptBR from '../locales/pt-BR.js'
import { DATE_LOCALES, LANGS } from './i18n-core.js'

const placeholders = value => [...String(value).matchAll(/\{\d+\}/g)].map(match => match[0]).sort()

describe('Brazilian Portuguese locale', () => {
  test('is a separately selectable locale with Brazilian date formatting', () => {
    expect(LANGS.pt).toBe('Português (Portugal)')
    expect(LANGS['pt-BR']).toBe('Português (Brasil)')
    expect(DATE_LOCALES['pt-BR']).toBe('pt-BR')
  })

  test('has the complete key set and preserves interpolation placeholders', () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(pt).sort())
    for (const [source, translated] of Object.entries(ptBR)) {
      expect(placeholders(translated), source).toEqual(placeholders(source))
    }
  })

  test('does not leak the most visible European Portuguese UI terms', () => {
    const text = Object.values(ptBR).join('\n')
    expect(text).not.toMatch(/\b(ficheiro\w*|telemóvel\w*|ecrã\w*|regist(?:ar|ado|ada|ados|adas|o|os)|eliminar|definições)\b/i)
    expect(ptBR.Save).toBe('Salvar')
    expect(ptBR.Settings).toBe('Configurações')
    expect(ptBR['Delete workout']).toBe('Excluir treino')
  })
})
