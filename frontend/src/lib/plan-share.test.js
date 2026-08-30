import { describe, expect, it } from 'vitest'
import { buildPlanBundle, mergePlan, parsePlan } from './plan-share.js'

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

  it('carries progression exclusion on a routine through export and merge', () => {
    const source = stateWith({})
    source.routines[0].excludeFromProgression = true
    const bundle = parsePlan(buildPlanBundle(source, 'Plan'))
    const target = { routines: [], week: {}, customEx: [] }

    expect(bundle.routines[0].excludeFromProgression).toBe(true)
    mergePlan(target, bundle)
    expect(target.routines[0].excludeFromProgression).toBe(true)
  })

  // Issue #10: the rest an exercise prescribes is part of the prescription. A shared 5x5 whose
  // rests arrive as the recipient's 60 s default is a different session than the one written.
  it('carries a per-exercise rest', () => {
    expect(roundTrip({ restSec: 180 }).restSec).toBe(180)
  })

  // The absence has to survive too: writing a 0 would pin the recipient's timer to "off"
  // instead of letting the exercise keep inheriting whatever their own default is.
  it('leaves an exercise that set no rest free of the field', () => {
    expect('restSec' in roundTrip({})).toBe(false)
    expect('restSec' in roundTrip({ restSec: 0 })).toBe(false)
  })

  it('carries the rest onto the routine mergePlan adds', () => {
    const bundle = parsePlan(JSON.stringify(buildPlanBundle(stateWith({ restSec: 180 }), 'Plan')))
    const s = { routines: [], customEx: [], week: {} }
    mergePlan(s, bundle, { schedule: false })
    expect(s.routines[0].ex[0].restSec).toBe(180)
  })

  it('drops an intensifier it does not recognise rather than passing it on', () => {
    expect(roundTrip({ intensifier: { type: 'nonsense', count: 3 } }).intensifier).toBeUndefined()
  })

  it('clamps a hand-edited warm-up count instead of showing it verbatim', () => {
    const bundle = { opengym_plan: 1, name: 'x', routines: [{ id: 'r', name: 'R', ex: [{ id: '0025', sets: 3, reps: 5, warmupSets: 999 }] }], week: {}, customEx: [] }
    expect(parsePlan(bundle).routines[0].ex[0].warmupSets).toBe(5)
  })

  // A plan file is someone else's data: a rest that arrives as a string would reach the timer's
  // arithmetic as one, and a negative or garbage one has no meaning to keep.
  it('normalises a hand-edited rest to a positive whole number or drops it', () => {
    const withRest = restSec => ({ opengym_plan: 1, name: 'x', routines: [{ id: 'r', name: 'R', ex: [{ id: '0025', sets: 3, reps: 5, restSec }] }], week: {}, customEx: [] })
    expect(parsePlan(withRest('120')).routines[0].ex[0].restSec).toBe(120)
    expect(parsePlan(withRest(90.6)).routines[0].ex[0].restSec).toBe(91)
    expect('restSec' in parsePlan(withRest(-30)).routines[0].ex[0]).toBe(false)
    expect('restSec' in parsePlan(withRest('abc')).routines[0].ex[0]).toBe(false)
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
