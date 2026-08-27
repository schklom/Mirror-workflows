import { describe, expect, it } from 'vitest'
import { insertionIndexAfterCurrentUnit, nextUnfinishedUnit, setProgressHighWater, supersetFlowStep, restAfterSet, restOnRecheck } from './supersetFlow.js'

const entry = done => ({ sets: done.map(value => ({ done: value })) })

describe('restAfterSet', () => {
  it('rests between the sets of an exercise', () => {
    expect(restAfterSet({ unitDone: false, lastUnit: false })).toBe(true)
    expect(restAfterSet({ unitDone: false, lastUnit: true })).toBe(true)
  })

  // Issue #3: a two-set exercise timed one rest instead of two, because the closing set
  // "finished quietly". The next exercise still follows it, so the rest belongs there.
  it('rests after the closing set when another exercise follows', () => {
    expect(restAfterSet({ unitDone: true, lastUnit: false })).toBe(true)
  })

  it('stays quiet only on the very last set of the session', () => {
    expect(restAfterSet({ unitDone: true, lastUnit: true })).toBe(false)
  })
})

describe('supersetFlowStep', () => {
  it('does not create navigation or rest flow for a normal singleton exercise', () => {
    const entries = [entry([true]), entry([false])]
    expect(supersetFlowStep(entries, [0], 0)).toBeNull()
  })

  it('does not count an uncheck/re-check of previously completed work as new progress', () => {
    const finished = entry([true, true, true])
    expect(setProgressHighWater(finished, 3)).toEqual({ isNew: false, highWater: 3 })
    expect(setProgressHighWater(finished, 2)).toEqual({ isNew: true, highWater: 3 })
  })

  it('skips a spent short member and uses the last member with work as the round boundary', () => {
    // A has just completed set two of three; B's only set was completed last round.
    const entries = [entry([true, true, false]), entry([true])]
    expect(supersetFlowStep(entries, [0, 1], 0)).toEqual({
      unitDone: false,
      roundDone: true,
      nextIdx: 0
    })
  })

  it('wraps to the next member with work at a normal round boundary', () => {
    const entries = [entry([true, false, false]), entry([true])]
    expect(supersetFlowStep(entries, [0, 1], 1)).toEqual({
      unitDone: false,
      roundDone: true,
      nextIdx: 0
    })
  })
})

describe('active workout unit ordering', () => {
  it('inserts after the whole current unit', () => {
    expect(insertionIndexAfterCurrentUnit([[0, 1], [2]], 0, 3)).toBe(2)
    expect(insertionIndexAfterCurrentUnit([[0], [1]], 1, 2)).toBe(2)
    expect(insertionIndexAfterCurrentUnit([], 0, 0)).toBe(0)
  })

  it('finds the next unfinished unit, skips completed units, and wraps once', () => {
    const entries = [entry([false]), entry([true]), entry([false]), entry([true])]
    const units = [[0], [1], [2, 3]]
    expect(nextUnfinishedUnit(entries, units, 0)).toEqual([2, 3])
    expect(nextUnfinishedUnit(entries, units, 2)).toEqual([0])
  })

  it('returns null only when every unit is complete', () => {
    const entries = [entry([true]), entry([true])]
    expect(nextUnfinishedUnit(entries, [[0], [1]], 1)).toBeNull()
  })
})

// Issue #3 has two halves. restAfterSet covers "no break after the LAST set of an exercise";
// this covers "after the first set, sometimes a break doesn't appear" — the uncheck/re-check
// that the high-water rule swallows.
describe('rest on a re-check', () => {
  it('starts the rest a swallowed re-check would otherwise cost you', () => {
    expect(restOnRecheck({ timerRunning: false, unitDone: false, lastUnit: false })).toBe(true)
  })

  it('leaves a rest that is already counting alone', () => {
    expect(restOnRecheck({ timerRunning: true, unitDone: false, lastUnit: false })).toBe(false)
  })

  it('still stays quiet on the last set of the last exercise', () => {
    expect(restOnRecheck({ timerRunning: false, unitDone: true, lastUnit: true })).toBe(false)
  })

  it('rests after closing an exercise that is not the last one', () => {
    expect(restOnRecheck({ timerRunning: false, unitDone: true, lastUnit: false })).toBe(true)
  })
})
