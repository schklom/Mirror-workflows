import { describe, it, expect } from 'vitest'
import {
  phaseForSet, isWarmupRow, modeForSet, modeForEntry,
  setType, isDropSet, isRestPauseSet, dropsOf, clustersOf, extraVolumeOf,
  addDrop, addCluster, removeDropAt, removeClusterAt, setDropAt, setClusterAt,
  nextDropWeight, nextBurstReps, splitBurstReps,
} from './workout-model.js'

describe('phaseForSet / isWarmupRow', () => {
  it('reads both the explicit phase and the legacy boolean', () => {
    expect(isWarmupRow({ phase: 'warmup' })).toBe(true)
    expect(isWarmupRow({ warmup: true })).toBe(true)
    expect(isWarmupRow({ phase: 'work' })).toBe(false)
    expect(isWarmupRow({})).toBe(false)
  })
})

describe('setType / isDropSet / isRestPauseSet', () => {
  it('defaults to straight for anything without a recognised type', () => {
    expect(setType({})).toBe('straight')
    expect(setType({ type: 'nonsense' })).toBe('straight')
    expect(setType(null)).toBe('straight')
    expect(isDropSet({})).toBe(false)
    expect(isRestPauseSet({})).toBe(false)
  })

  it('recognises drop-set and rest-pause rows', () => {
    expect(setType({ type: 'dropset' })).toBe('dropset')
    expect(isDropSet({ type: 'dropset' })).toBe(true)
    expect(setType({ type: 'restpause' })).toBe('restpause')
    expect(isRestPauseSet({ type: 'restpause' })).toBe(true)
  })

  it('is a separate axis from warm-up — a row is not both at once by construction, but phase never leaks into type', () => {
    expect(setType({ phase: 'warmup', type: 'dropset' })).toBe('dropset')
    expect(isWarmupRow({ phase: 'warmup', type: 'dropset' })).toBe(true)
  })
})

describe('dropsOf / clustersOf', () => {
  it('only return rows for their own type', () => {
    const drop = { type: 'dropset', drops: [{ w: 80, r: 5 }] }
    const burst = { type: 'restpause', clusters: [{ r: 4, restSec: 15 }] }
    expect(dropsOf(drop)).toEqual([{ w: 80, r: 5 }])
    expect(clustersOf(drop)).toEqual([])
    expect(clustersOf(burst)).toEqual([{ r: 4, restSec: 15 }])
    expect(dropsOf(burst)).toEqual([])
  })

  it('is defensive about missing/malformed arrays', () => {
    expect(dropsOf({ type: 'dropset' })).toEqual([])
    expect(dropsOf({ type: 'dropset', drops: 'nope' })).toEqual([])
    expect(clustersOf(null)).toEqual([])
  })
})

describe('extraVolumeOf', () => {
  it('sums weight x reps across a drop-set\'s own drops', () => {
    const set = { type: 'dropset', w: 100, r: 5, drops: [{ w: 80, r: 5 }, { w: 60, r: 6 }] }
    expect(extraVolumeOf(set)).toBe(80 * 5 + 60 * 6)
  })

  it('is zero for rest-pause — its own r is already the total across every burst, so clusters are a breakdown, not extra volume', () => {
    const set = { type: 'restpause', w: 60, r: 20, clusters: [{ r: 10, restSec: 15 }, { r: 5, restSec: 15 }, { r: 3, restSec: 15 }, { r: 1, restSec: 15 }, { r: 1, restSec: 15 } ] }
    expect(extraVolumeOf(set)).toBe(0)
  })

  it('is zero for a straight or warm-up set', () => {
    expect(extraVolumeOf({ w: 100, r: 5 })).toBe(0)
    expect(extraVolumeOf({ phase: 'warmup', w: 20, r: 8 })).toBe(0)
  })
})

describe('addDrop / addCluster', () => {
  it('appends a drop and stamps the row as a drop-set', () => {
    const set = { w: 100, r: 5, done: true }
    const next = addDrop(set, { w: 80, r: 5 })
    expect(next.type).toBe('dropset')
    expect(next.drops).toEqual([{ w: 80, r: 5 }])
    expect(set.drops).toBeUndefined() // pure — the original row is untouched
    expect(addDrop(next, { w: 60, r: 4 }).drops).toEqual([{ w: 80, r: 5 }, { w: 60, r: 4 }])
  })

  it('appends a burst and stamps the row as a rest-pause set', () => {
    const set = { w: 60, r: 8, done: true }
    const next = addCluster(set, { r: 4, restSec: 15 })
    expect(next.type).toBe('restpause')
    expect(next.clusters).toEqual([{ r: 4, restSec: 15 }])
  })
})

describe('removeDropAt / removeClusterAt', () => {
  it('removes one entry by index, leaving the rest in place', () => {
    const set = { type: 'dropset', w: 100, r: 5, drops: [{ w: 80, r: 5 }, { w: 60, r: 5 }] }
    expect(removeDropAt(set, 0).drops).toEqual([{ w: 60, r: 5 }])
  })

  it('removes one burst by index', () => {
    const set = { type: 'restpause', w: 60, r: 8, clusters: [{ r: 4, restSec: 15 }, { r: 3, restSec: 15 }] }
    expect(removeClusterAt(set, 1).clusters).toEqual([{ r: 4, restSec: 15 }])
  })

  it('reverts the row to a straight set once its last drop/burst is removed', () => {
    const drop = { type: 'dropset', w: 100, r: 5, drops: [{ w: 80, r: 5 }] }
    expect(removeDropAt(drop, 0)).toEqual({ type: 'straight', w: 100, r: 5, drops: [] })
    expect(isDropSet(removeDropAt(drop, 0))).toBe(false)

    const burst = { type: 'restpause', w: 60, r: 8, clusters: [{ r: 4, restSec: 15 }] }
    expect(removeClusterAt(burst, 0)).toEqual({ type: 'straight', w: 60, r: 8, clusters: [] })
    expect(isRestPauseSet(removeClusterAt(burst, 0))).toBe(false)
  })
})

describe('setDropAt / setClusterAt', () => {
  it('patches one drop\'s fields, leaving the others untouched', () => {
    const set = { type: 'dropset', w: 100, r: 5, drops: [{ w: 80, r: 5 }, { w: 60, r: 5 }] }
    expect(setDropAt(set, 0, { w: 82.5 }).drops).toEqual([{ w: 82.5, r: 5 }, { w: 60, r: 5 }])
    expect(setDropAt(set, 1, { r: 6 }).drops).toEqual([{ w: 80, r: 5 }, { w: 60, r: 6 }])
  })

  it('patches one burst\'s reps', () => {
    const set = { type: 'restpause', w: 60, r: 8, clusters: [{ r: 4, restSec: 15 }] }
    expect(setClusterAt(set, 0, { r: 5 }).clusters).toEqual([{ r: 5, restSec: 15 }])
  })

  it('is a no-op for an index that does not exist', () => {
    const set = { type: 'dropset', w: 100, r: 5, drops: [{ w: 80, r: 5 }] }
    expect(setDropAt(set, 3, { w: 1 })).toBe(set)
  })
})

describe('nextDropWeight / nextBurstReps', () => {
  it('drops by the given percentage, rounded to the nearest .5', () => {
    expect(nextDropWeight(100, 20)).toBe(80)
    expect(nextDropWeight(80, 20)).toBe(64)
    expect(nextDropWeight(61, 10)).toBe(55)
  })

  it('defaults to 20% and never goes negative', () => {
    expect(nextDropWeight(100)).toBe(80)
    expect(nextDropWeight(0, 20)).toBe(0)
  })

  it('roughly halves the previous rep count, floored at 1', () => {
    expect(nextBurstReps(8)).toBe(4)
    expect(nextBurstReps(1)).toBe(1)
    expect(nextBurstReps(0)).toBe(1)
  })
})

describe('splitBurstReps', () => {
  it('splits a total into a descending, roughly-halving sequence that adds back up to it', () => {
    expect(splitBurstReps(12)).toEqual([6, 3, 2, 1])
    expect(splitBurstReps(6)).toEqual([3, 2, 1])
    expect(splitBurstReps(1)).toEqual([1])
  })

  it('every split sums exactly to the requested total', () => {
    for (const total of [1, 2, 3, 5, 7, 10, 15, 20, 33]) {
      expect(splitBurstReps(total).reduce((a, b) => a + b, 0)).toBe(total)
    }
  })

  it('is empty for zero or invalid input', () => {
    expect(splitBurstReps(0)).toEqual([])
    expect(splitBurstReps(-5)).toEqual([])
    expect(splitBurstReps(undefined)).toEqual([])
  })
})

describe('modeForSet / modeForEntry stay reps-mode for drop-sets and rest-pause sets', () => {
  it('infers reps mode from the row\'s own r field regardless of type', () => {
    expect(modeForSet({ type: 'dropset', w: 100, r: 5 })).toBe('reps')
    expect(modeForSet({ type: 'restpause', w: 60, r: 8 })).toBe('reps')
  })

  it('an entry mixing straight and drop-set rows still reads as one reps-mode entry', () => {
    const entry = { sets: [{ w: 100, r: 5 }, { type: 'dropset', w: 100, r: 5, drops: [{ w: 80, r: 5 }] }] }
    expect(modeForEntry(entry)).toBe('reps')
  })
})
