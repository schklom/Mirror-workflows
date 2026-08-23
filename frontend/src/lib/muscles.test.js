import { describe, it, expect } from 'vitest'
import { EXIDX, EXDB, smOf } from './exercises.js'
import { MUSCLE_NAME, exerciseMuscleSnapshot, loadOf, loadOfWorkouts, matchesMuscleGroups, muscleGroupsOf, musclesOf } from './muscles.js'

describe('multi-muscle exercise metadata', () => {
  it('normalizes legacy primary/secondary fields and removes duplicate groups', () => {
    const ex = { tg: 'pectorals', mg: 'triceps', sm: ['triceps', 'chest'] }
    expect(muscleGroupsOf(ex)).toEqual(['chest', 'triceps'])
    expect(musclesOf(ex)).toEqual({ chest: 1, triceps: 0.4 })
  })

  it('uses explicit multi-group metadata when present and supports legacy single groups', () => {
    expect(muscleGroupsOf({ muscleGroups: ['chest', 'pectorals', 'triceps'] })).toEqual(['chest', 'triceps'])
    expect(muscleGroupsOf({ tg: 'chest' })).toEqual(['chest'])
    expect(MUSCLE_NAME.chest).toBe('Chest')
  })

  it('falls back to the legacy body-part map when an optional multi-group field is empty', () => {
    expect(muscleGroupsOf({ bp: 'back', muscleGroups: [] })).toEqual(['upper-back', 'lower-back'])
    expect(matchesMuscleGroups({ bp: 'back', muscleGroups: [] }, ['lower-back'])).toBe(true)
  })

  it('matches an exercise when any requested muscle group matches', () => {
    const ex = { muscleGroups: ['chest', 'triceps'] }
    expect(matchesMuscleGroups(ex, ['hamstring', 'triceps'])).toBe(true)
    expect(matchesMuscleGroups(ex, ['hamstring', 'gluteal'])).toBe(false)
    expect(matchesMuscleGroups(ex, [])).toBe(true)
  })

  it('counts one effective set per unique group instead of double counting duplicates', () => {
    expect(loadOf([{ id: 'inline', ex: { tg: 'chest', sm: ['chest', 'triceps'] }, sets: 2 }]))
      .toEqual({ chest: 2, triceps: 0.8 })
  })

  it('uses multi-muscle metadata carried by a history entry when its catalogue id is unavailable', () => {
    expect(loadOfWorkouts([{ entries: [{
      id: 'deleted-custom', muscleGroups: ['chest', 'chest', 'triceps'],
      sets: [{ done: true }]
    }] }])).toEqual({ chest: 1, triceps: 1 })
  })
})

describe('catalogue secondary muscles', () => {
  it('maps a bench press to chest, triceps and deltoids', () => {
    expect(musclesOf(EXIDX['0025'])).toMatchObject({
      chest: 1,
      triceps: 0.4,
      deltoids: 0.4,
    })
  })

  it('maps a squat to glutes, quads and hamstrings', () => {
    expect(musclesOf(EXIDX['0043'])).toMatchObject({
      gluteal: 1,
      quadriceps: 1,
      hamstring: 0.4,
    })
  })

  it('maps common row variations to the upper back, biceps and rear deltoids', () => {
    for (const id of ['0027', '0293', '0499', '0861']) {
      expect(musclesOf(EXIDX[id])).toMatchObject({
        'upper-back': 1,
        biceps: 0.4,
        deltoids: 0.4,
      })
    }
  })
})


describe('catalogue secondary additions', () => {
  it('enriches the muscle map without mutating the raw dataset', () => {
    const raw = EXDB.find(e => e.id === '0027')
    expect(raw.sm).not.toContain('rear deltoids')
    expect(smOf(raw)).toContain('rear deltoids')
    // the alias collapses onto the deltoids slug in the canonical muscle map
    expect(musclesOf(raw)).toHaveProperty('deltoids')
  })
})


describe('explicit multi-primary metadata', () => {
  it('gives every primary full weight and secondaries supporting weight', () => {
    const ex = {
      bp: 'chest', tg: 'abs', mg: 'triceps', sm: ['lower back'],
      primaries: ['chest', 'triceps', 'chest'], secondaries: ['deltoids', 'triceps']
    }
    expect(muscleGroupsOf(ex)).toEqual(['chest', 'triceps', 'deltoids'])
    expect(musclesOf(ex)).toEqual({ chest: 1, triceps: 1, deltoids: 0.4 })
  })

  it('keeps the body-part fallback when primaries are absent or explicitly empty', () => {
    const expected = { 'upper-back': 0.75, 'lower-back': 0.25 }
    expect(musclesOf({ bp: 'back' })).toEqual(expected)
    expect(musclesOf({ bp: 'back', primaries: [] })).toEqual(expected)
  })

  it('keeps legacy metadata when a new array field is present but empty', () => {
    expect(exerciseMuscleSnapshot({ bp: 'chest', tg: 'abs', primaries: [] })).toMatchObject({
      muscleGroups: ['abs']
    })
  })

  it('provides a conservative Full body fallback for legacy custom exercises', () => {
    expect(muscleGroupsOf({ bp: 'full body' })).toEqual(['chest', 'upper-back', 'gluteal', 'quadriceps', 'hamstring', 'abs'])
    expect(musclesOf({ bp: 'full body' })).toEqual({
      chest: 0.2, 'upper-back': 0.2, gluteal: 0.2, quadriceps: 0.2, hamstring: 0.1, abs: 0.1
    })
  })

  it('preserves explicit primary and secondary arrays in history snapshots', () => {
    expect(exerciseMuscleSnapshot({
      n: 'Deadlift', bp: 'full body', primaries: ['gluteal', 'lower-back'], secondaries: ['hamstring']
    })).toMatchObject({
      n: 'Deadlift', bp: 'full body', primaries: ['gluteal', 'lower-back'], secondaries: ['hamstring'],
      muscleGroups: ['gluteal', 'lower-back', 'hamstring']
    })
  })
})


describe('map load with warm-up phases', () => {
  it('excludes warm-up sets from the by-sets-worked map', () => {
    const w = {
      id: 'w1', d: '2026-08-01', start: Date.UTC(2026, 7, 1, 10), unit: 'kg',
      entries: [{
        id: '0025',
        sets: [
          { done: true, phase: 'warmup', w: 20, r: 8 },
          { done: true, phase: 'work', w: 60, r: 8 },
        ],
      }],
    }
    const load = loadOfWorkouts([w], null)
    expect(load.chest).toBe(1)
  })
})
