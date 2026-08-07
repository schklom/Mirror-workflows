import { describe, expect, it } from 'vitest'
import { FATIGUE_STATES, fatigueOf, strengthOf } from './recovery.js'
import { fatigueStateOf } from './recovery-view.js'
import { MUSCLES, levelsOf } from './muscles.js'

const FATIGUE_BANDS = [
  { at: 0, level: 4 },
  { at: 0.25, level: 2 },
  { at: 0.5, level: 0, exclusive: true },
]
const STRENGTH_BANDS = [
  { at: 0.5, level: 0 },
  { at: 0.625, level: 1 },
  { at: 0.75, level: 2 },
  { at: 0.875, level: 3 },
  { at: 1, level: 4 },
]

describe('production recovery view selectors', () => {
  it('preserves the relative balance scale when no thresholds are supplied', () => {
    const levels = levelsOf({ chest: 10, biceps: 5 })
    expect(levels.chest).toBe(4)
    expect(levels.biceps).toBe(2)
  })

  it('uses the production fatigue selector at both approved boundaries', () => {
    expect(fatigueStateOf(0.2499)).toBe(FATIGUE_STATES.READY)
    expect(fatigueStateOf(0.25)).toBe(FATIGUE_STATES.RECOVERING)
    expect(fatigueStateOf(0.5)).toBe(FATIGUE_STATES.RECOVERING)
    expect(fatigueStateOf(0.5001)).toBe(FATIGUE_STATES.FATIGUED)
  })

  it('renders fatigue bands on a fixed absolute scale rather than relative to the map maximum', () => {
    const levels = levelsOf({
      chest: 0.25,
      biceps: 0.6,
      triceps: 0.1,
    }, FATIGUE_BANDS)
    expect(levels.chest).toBe(2)
    expect(levels.biceps).toBe(0)
    expect(levels.triceps).toBe(4)
  })

  it('renders strength on fixed .5-to-1 bands with full retention at l4', () => {
    const levels = levelsOf({ chest: 0.9, biceps: 1, triceps: 0.5 }, STRENGTH_BANDS)
    expect(levels.chest).toBe(3)
    expect(levels.biceps).toBe(4)
    expect(levels.triceps).toBe(0)
  })

  it('keeps selectors tied to the same render-time clock', () => {
    const now = Date.UTC(2026, 0, 22)
    const workout = { start: now - 15 * 86400000, d: '2026-01-07', entries: [] }
    expect(strengthOf([workout], now).chest).toBe(0.5)
    expect(fatigueOf([workout], now).chest).toBe(0)
    expect(strengthOf([workout], now + 7 * 86400000).chest).toBe(0.5)
  })
})
