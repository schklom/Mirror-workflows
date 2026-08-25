import { describe, expect, it } from 'vitest'
import { buildPlanBundle, parsePlan } from './plan-share.js'

// There was no test file for plan sharing at all, which is how a whole prescription field
// went missing without anyone noticing.
const stateWith = ex => ({
  routines: [{ id: 'r1', name: 'Push', ex: [{ id: '0025', sets: 3, reps: 5, weight: 100, ...ex }] }],
  week: {}, customEx: [],
})
const roundTrip = ex => parsePlan(JSON.stringify(buildPlanBundle(stateWith(ex), 'Plan'))).routines[0].ex[0]

describe('what survives a shared plan', () => {
  it('carries a drop-set prescription', () => {
    expect(roundTrip({ intensifier: { type: 'dropset', count: 2, pct: 20 } }).intensifier)
      .toEqual({ type: 'dropset', count: 2, pct: 20 })
  })

  it('carries a rest-pause prescription', () => {
    expect(roundTrip({ intensifier: { type: 'restpause', totalReps: 12, restSec: 15 } }).intensifier)
      .toEqual({ type: 'restpause', totalReps: 12, restSec: 15 })
  })

  it('carries planned warm-ups', () => {
    expect(roundTrip({ warmupSets: 3 }).warmupSets).toBe(3)
  })

  it('drops an intensifier it does not recognise rather than passing it on', () => {
    expect(roundTrip({ intensifier: { type: 'nonsense', count: 3 } }).intensifier).toBeUndefined()
  })

  it('clamps a hand-edited warm-up count instead of showing it verbatim', () => {
    const bundle = { opengym_plan: 1, name: 'x', routines: [{ id: 'r', name: 'R', ex: [{ id: '0025', sets: 3, reps: 5, warmupSets: 999 }] }], week: {}, customEx: [] }
    expect(parsePlan(bundle).routines[0].ex[0].warmupSets).toBe(5)
  })

  // The floors are the config sheet's own (count >= 1, pct >= 5); a value that is present but
  // out of range is pulled up to the floor, while a missing one falls back to the default.
  it('clamps out-of-range intensifier numbers to the floors the app enforces', () => {
    const bundle = { opengym_plan: 1, name: 'x', routines: [{ id: 'r', name: 'R', ex: [{ id: '0025', sets: 3, reps: 5, intensifier: { type: 'dropset', count: 0, pct: -5 } }] }], week: {}, customEx: [] }
    expect(parsePlan(bundle).routines[0].ex[0].intensifier).toEqual({ type: 'dropset', count: 1, pct: 5 })
  })

  it('falls back to the default drop percentage when the file omits it', () => {
    const bundle = { opengym_plan: 1, name: 'x', routines: [{ id: 'r', name: 'R', ex: [{ id: '0025', sets: 3, reps: 5, intensifier: { type: 'dropset' } }] }], week: {}, customEx: [] }
    expect(parsePlan(bundle).routines[0].ex[0].intensifier).toEqual({ type: 'dropset', count: 1, pct: 20 })
  })
})
