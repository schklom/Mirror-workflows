import { describe, expect, it } from 'vitest'
import { fmtAgo, changeCount } from './format.js'

// "Last synced: …" in Settings — the platform words it, in the UI language (en-GB here).
describe('fmtAgo', () => {
  const now = Date.UTC(2026, 8, 23, 12, 0, 0)
  it('reads the coarsest whole unit back from now', () => {
    expect(fmtAgo(now - 20 * 1000, now)).toBe('now')
    expect(fmtAgo(now - 5 * 60000, now)).toBe('5 minutes ago')
    expect(fmtAgo(now - 3 * 3600000 - 59 * 60000, now)).toBe('3 hours ago')
    expect(fmtAgo(now - 86400000, now)).toBe('yesterday')
    expect(fmtAgo(now - 9 * 86400000, now)).toBe('9 days ago')
  })

  it('a time ahead of the clock (the clock was set back) reads as now, not "in 5 minutes"', () => {
    expect(fmtAgo(now + 5 * 60000, now)).toBe('now')
  })
})

describe('changeCount', () => {
  it('has a singular', () => {
    expect(changeCount(1)).toBe('1 change')
    expect(changeCount(3)).toBe('3 changes')
  })
})
