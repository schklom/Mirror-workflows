// @vitest-environment happy-dom
// #303: DEFAULT_LANG from /api/config sets the language of a fresh copy — the sign-in screen,
// and a profile created from it — and nothing else. A copy saved before the mark existed keeps
// its language even when that is the old default, 'en': it may well have been chosen.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api.js', () => ({ api: vi.fn() }))

import { api } from '../lib/api.js'
import { useStore, freshState, DEF } from './useStore.js'

const nav = langs => Object.defineProperty(navigator, 'languages', { value: langs, configurable: true })

beforeEach(() => { api.mockReset(); nav(['en-US']); useStore.setState({ config: null }) })
afterEach(() => { useStore.setState({ config: null }) })

describe('instance default language', () => {
  it('a fresh copy is marked as not having picked a language; DEF is not', () => {
    expect(freshState().langAuto).toBe(true)
    expect(DEF.langAuto).toBeUndefined()
  })

  it('a fresh copy takes DEFAULT_LANG once the config is in', async () => {
    useStore.setState({ S: freshState() })
    useStore.getState().applyAutoLang()
    expect(useStore.getState().S.lang).toBe('en')   // nothing to go on before the config

    api.mockResolvedValueOnce({ invite_only: false, allow_guest: true, default_lang: 'pt-BR' })
    await useStore.getState().refreshConfig()
    useStore.getState().applyAutoLang()
    expect(useStore.getState().S.lang).toBe('pt-BR')
    expect(useStore.getState().S.langAuto).toBe(true)
  })

  it('without DEFAULT_LANG a fresh copy follows the browser when the app speaks it', () => {
    nav(['de-DE', 'en'])
    useStore.setState({ S: freshState(), config: { invite_only: false, allow_guest: true } })
    useStore.getState().applyAutoLang()
    expect(useStore.getState().S.lang).toBe('de')
  })

  it('an existing copy with lang "en" and no mark is left in English', () => {
    nav(['de-DE'])
    useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), lang: 'en' }, config: { default_lang: 'pt-BR' } })
    useStore.getState().applyAutoLang()
    expect(useStore.getState().S.lang).toBe('en')
  })

  it('a language picked in Settings wins over DEFAULT_LANG from then on', () => {
    useStore.setState({ S: freshState(), config: { default_lang: 'pt-BR' } })
    useStore.getState().applyAutoLang()
    expect(useStore.getState().S.lang).toBe('pt-BR')
    // What the Settings picker does.
    useStore.getState().update(s => { s.lang = 'en'; s.langAuto = false })
    useStore.getState().applyAutoLang()
    expect(useStore.getState().S.lang).toBe('en')
  })
})
