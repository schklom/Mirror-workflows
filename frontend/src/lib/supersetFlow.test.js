import { describe, expect, it } from 'vitest'
import { setProgressHighWater, supersetFlowStep } from './supersetFlow.js'

const entry = done => ({ sets: done.map(value => ({ done: value })) })

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
