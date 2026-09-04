// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api.js', () => ({ api: vi.fn(), setRemoteAuth: vi.fn() }))

import { DEF, useStore } from './useStore.js'

const clone = value => JSON.parse(JSON.stringify(value))

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ S: clone(DEF), user: null, ready: false })
})

afterEach(() => {
  localStorage.clear()
  useStore.setState({ S: clone(DEF), user: null, ready: false })
})

// gymCards is plain profile data — it rides the same update()/persist() path as everything else,
// with no backend or schema change. These pin the contract the check-in view relies on: a fresh
// profile starts empty, and adding/removing a card mutates and persists like any other field.

describe('gymCards state', () => {
  it('defaults to an empty array on a fresh profile', () => {
    expect(useStore.getState().S.gymCards).toEqual([])
  })

  it('adds a card via update and persists it to localStorage', () => {
    useStore.getState().update(s => {
      s.gymCards.push({ id: 'c1', label: 'FitZone', value: 'ABC123', fmt: 'qrcode' })
    }, false)

    const cards = useStore.getState().S.gymCards
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ id: 'c1', label: 'FitZone', value: 'ABC123', fmt: 'qrcode' })

    // persist() writes the whole state under the app's storage key — the card must be in it.
    const saved = JSON.parse(localStorage.getItem('gym_state_v1'))
    expect(saved.gymCards).toHaveLength(1)
    expect(saved.gymCards[0].value).toBe('ABC123')
  })

  it('removes a card by id, leaving the others', () => {
    useStore.getState().update(s => {
      s.gymCards.push({ id: 'a', label: 'A', value: '1', fmt: 'qrcode' })
      s.gymCards.push({ id: 'b', label: 'B', value: '2', fmt: 'qrcode' })
    }, false)

    useStore.getState().update(s => {
      s.gymCards = s.gymCards.filter(c => c.id !== 'a')
    }, false)

    const cards = useStore.getState().S.gymCards
    expect(cards).toHaveLength(1)
    expect(cards[0].id).toBe('b')
  })

  it('keeps multiple cards in insertion order', () => {
    useStore.getState().update(s => {
      s.gymCards.push({ id: '1', label: 'One', value: 'x', fmt: 'qrcode' })
      s.gymCards.push({ id: '2', label: 'Two', value: 'y', fmt: 'qrcode' })
      s.gymCards.push({ id: '3', label: 'Three', value: 'z', fmt: 'qrcode' })
    }, false)

    expect(useStore.getState().S.gymCards.map(c => c.id)).toEqual(['1', '2', '3'])
  })
})

// The Settings switch. On by default; an older profile that predates the key must read as on
// too, and off only hides the feature — the cards themselves survive the round trip.
describe('checkIn switch', () => {
  it('is on for a fresh profile', () => {
    expect(useStore.getState().S.checkIn).toBe(true)
  })

  it('turning it off keeps the saved cards', () => {
    useStore.getState().update(s => {
      s.gymCards.push({ id: 'c1', label: 'FitZone', value: 'ABC123', fmt: 'qrcode' })
      s.checkIn = false
    }, false)
    const S = useStore.getState().S
    expect(S.checkIn).toBe(false)
    expect(S.gymCards).toHaveLength(1)
  })
})
