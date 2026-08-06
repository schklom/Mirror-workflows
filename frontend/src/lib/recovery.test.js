import { describe, expect, it } from 'vitest'
import {
  FATIGUE_HALF_LIFE_MS,
  FATIGUE_STATES,
  FATIGUE_WINDOW_MS,
  STRENGTH_FLOOR,
  STRENGTH_FULL_MS,
  STRENGTH_HALF_LIFE_MS,
  detrainedMuscles,
  fatiguedMuscles,
  fatigueOf,
  halfLifeDecay,
  strengthOf,
} from './recovery.js'
import { EXDB } from './exercises.js'
import { MUSCLES, musclesOf } from './muscles.js'
import { fatigueStateOf } from './recovery-view.js'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const NOW = Date.UTC(2026, 0, 1, 12)

// Keep fixtures tied to the shipped catalogue while making the expected stimulus explicit.
const SINGLE = EXDB.find(ex => {
  const weights = musclesOf(ex)
  return ex.bp !== 'cardio' && Object.keys(weights).length === 1 && Object.values(weights)[0] === 1
})
const WEIGHTED = EXDB.find(ex => {
  const weights = musclesOf(ex)
  return ex.bp !== 'cardio' && Object.values(weights).includes(0.4)
})
if (!SINGLE || !WEIGHTED) throw new Error('recovery tests require single- and secondary-weight fixtures')

const SINGLE_WEIGHTS = musclesOf(SINGLE)
const WEIGHTED_WEIGHTS = musclesOf(WEIGHTED)
const SINGLE_SLUG = Object.keys(SINGLE_WEIGHTS)[0]
const WEIGHTED_PRIMARY_SLUG = Object.keys(WEIGHTED_WEIGHTS).find(slug => WEIGHTED_WEIGHTS[slug] === 1)
const SECONDARY_SLUG = Object.keys(WEIGHTED_WEIGHTS).find(slug => WEIGHTED_WEIGHTS[slug] === 0.4)
if (!WEIGHTED_PRIMARY_SLUG || !SECONDARY_SLUG) throw new Error('recovery tests require weighted primary and secondary fixtures')

const workoutAt = (id, start, sets = [{ done: true }]) => ({
  d: new Date(start).toISOString(),
  start,
  entries: [{ id, sets: sets.map(set => ({ ...set })) }],
})
const doneWorkoutAt = (id, start, count = 1) =>
  workoutAt(id, start, Array.from({ length: count }, () => ({ done: true })))
const zeroFatigue = () => Object.fromEntries(MUSCLES.map(slug => [slug, 0]))
const floorStrength = () => Object.fromEntries(MUSCLES.map(slug => [slug, STRENGTH_FLOOR]))

// Numeric fatigue remains the math API; the UI boundary selector is imported from production.
const stableFloat = value => Number(value.toFixed(12))

describe('recovery constants', () => {
  it('exports the pinned windows, half-lives, floor, and state labels', () => {
    expect(FATIGUE_WINDOW_MS).toBe(72 * HOUR)
    expect(FATIGUE_HALF_LIFE_MS).toBe(36 * HOUR)
    expect(STRENGTH_FULL_MS).toBe(14 * DAY)
    expect(STRENGTH_HALF_LIFE_MS).toBe(28 * DAY)
    expect(STRENGTH_FLOOR).toBe(0.5)
    expect(FATIGUE_STATES).toEqual({ READY: 'ready', RECOVERING: 'recovering', FATIGUED: 'fatigued' })
    expect(halfLifeDecay(FATIGUE_HALF_LIFE_MS, FATIGUE_HALF_LIFE_MS)).toBe(0.5)
  })
})

describe('fatigueOf and strengthOf', () => {
  it('returns every muscle, ready/floor defaults, and hook defaults for empty history', () => {
    const fatigue = fatigueOf([], NOW)
    const strength = strengthOf([], NOW)

    expect(Object.keys(fatigue)).toEqual(MUSCLES)
    expect(fatigue).toEqual(zeroFatigue())
    expect(Object.values(fatigue).map(fatigueStateOf)).toEqual(
      MUSCLES.map(() => FATIGUE_STATES.READY),
    )
    expect(Object.keys(strength)).toEqual(MUSCLES)
    expect(strength).toEqual(floorStrength())
    expect(fatiguedMuscles([], NOW)).toEqual([])
    expect(detrainedMuscles([], NOW)).toEqual(MUSCLES)
  })

  it('applies one completed set to each of the exercise muscle weights', () => {
    const workouts = [doneWorkoutAt(WEIGHTED.id, NOW)]
    const fatigue = fatigueOf(workouts, NOW)
    const strength = strengthOf(workouts, NOW)

    for (const slug of MUSCLES) {
      const weight = WEIGHTED_WEIGHTS[slug] || 0
      expect(fatigue[slug]).toBe(weight)
      expect(strength[slug]).toBe(weight ? 1 : STRENGTH_FLOOR)
    }
    expect(fatiguedMuscles(workouts, NOW)).toEqual(
      Object.entries(WEIGHTED_WEIGHTS)
        .filter(([, weight]) => weight > 0.5)
        .map(([slug]) => slug),
    )
  })

  it('decays each weighted stimulus exactly at 36 hours and by sqrt-half at 18 hours', () => {
    for (const age of [FATIGUE_HALF_LIFE_MS, FATIGUE_HALF_LIFE_MS / 2]) {
      const fatigue = fatigueOf([doneWorkoutAt(WEIGHTED.id, NOW - age)], NOW)
      const expectedDecay = 0.5 ** (age / FATIGUE_HALF_LIFE_MS)
      for (const [slug, weight] of Object.entries(WEIGHTED_WEIGHTS)) {
        expect(fatigue[slug]).toBeCloseTo(weight * expectedDecay, 12)
      }
      if (age === FATIGUE_HALF_LIFE_MS) expect(fatigue[WEIGHTED_PRIMARY_SLUG]).toBe(0.5)
      if (age === FATIGUE_HALF_LIFE_MS / 2) {
        expect(fatigue[WEIGHTED_PRIMARY_SLUG]).toBeCloseTo(0.5 ** 0.5, 12)
      }
    }
  })

  it('excludes a completed set exactly at the strict 72-hour window edge', () => {
    const workouts = [doneWorkoutAt(SINGLE.id, NOW - FATIGUE_WINDOW_MS)]
    expect(fatigueOf(workouts, NOW)).toEqual(zeroFatigue())
    expect(strengthOf(workouts, NOW)[SINGLE_SLUG]).toBe(1)
  })

  it('ignores sets whose done flag is false for both axes', () => {
    const workouts = [workoutAt(WEIGHTED.id, NOW, [{ done: false }])]
    expect(fatigueOf(workouts, NOW)).toEqual(zeroFatigue())
    expect(strengthOf(workouts, NOW)).toEqual(floorStrength())
    expect(fatiguedMuscles(workouts, NOW)).toEqual([])
    expect(detrainedMuscles(workouts, NOW)).toEqual(MUSCLES)
  })
})

describe('fatigue state boundaries', () => {
  it('classifies exactly .25 as recovering and .2499 as ready', () => {
    const weight = WEIGHTED_WEIGHTS[SECONDARY_SLUG]
    const valueAt = target => {
      const age = FATIGUE_HALF_LIFE_MS * Math.log2(weight / target)
      const value = fatigueOf([doneWorkoutAt(WEIGHTED.id, NOW - age)], NOW)[SECONDARY_SLUG]
      expect(value).toBeCloseTo(target, 10)
      return stableFloat(value)
    }

    expect(fatigueStateOf(valueAt(0.25))).toBe(FATIGUE_STATES.RECOVERING)
    expect(fatigueStateOf(valueAt(0.2499))).toBe(FATIGUE_STATES.READY)
  })

  it('classifies exactly .5 as recovering, .5001 as fatigued, and hooks only fatigued muscles', () => {
    const atHalf = [doneWorkoutAt(SINGLE.id, NOW - FATIGUE_HALF_LIFE_MS)]
    const aboveHalf = [
      doneWorkoutAt(SINGLE.id, NOW - FATIGUE_HALF_LIFE_MS * Math.log2(1 / 0.5001)),
    ]
    const half = fatigueOf(atHalf, NOW)[SINGLE_SLUG]
    const above = fatigueOf(aboveHalf, NOW)[SINGLE_SLUG]

    expect(half).toBe(0.5)
    expect(fatigueStateOf(half)).toBe(FATIGUE_STATES.RECOVERING)
    expect(fatiguedMuscles(atHalf, NOW)).toEqual([])
    expect(above).toBeCloseTo(0.5001, 10)
    expect(fatigueStateOf(stableFloat(above))).toBe(FATIGUE_STATES.FATIGUED)
    expect(fatiguedMuscles(aboveHalf, NOW)).toEqual([SINGLE_SLUG])
  })
})

describe('strengthOf', () => {
  const strengthAt = age => strengthOf([doneWorkoutAt(SINGLE.id, NOW - age)], NOW)[SINGLE_SLUG]

  it('stays at full retention through 14 days and decays from 15 days by the 28-day half-life', () => {
    expect(strengthAt(STRENGTH_FULL_MS)).toBe(1)
    expect(strengthAt(15 * DAY)).toBeCloseTo(0.5 ** (1 / 28), 10)
  })

  it('clamps the 42-day half-life point and later 56-day value at the .5 floor', () => {
    expect(strengthAt(42 * DAY)).toBe(0.5)
    expect(strengthAt(56 * DAY)).toBe(STRENGTH_FLOOR)
  })

  it('resets retained strength when a later completed session retrains the muscle', () => {
    const workouts = [
      doneWorkoutAt(SINGLE.id, NOW - 20 * DAY),
      doneWorkoutAt(SINGLE.id, NOW),
    ]
    expect(strengthOf(workouts, NOW)[SINGLE_SLUG]).toBe(1)
  })
})

describe('accumulation and purity', () => {
  it('matches the sum of independently decayed stimuli in chronological order', () => {
    const ages = [64 * HOUR, 40 * HOUR]
    const workouts = ages.map(age => doneWorkoutAt(SINGLE.id, NOW - age))
    const expected = ages.reduce(
      (sum, age) => sum + 0.5 ** (age / FATIGUE_HALF_LIFE_MS),
      0,
    )

    expect(expected).toBeLessThan(1)
    expect(fatigueOf(workouts, NOW)[SINGLE_SLUG]).toBeCloseTo(expected, 12)
    expect(fatigueOf([...workouts].reverse(), NOW)[SINGLE_SLUG]).toBeCloseTo(expected, 12)
  })

  it('clamps saturation and returns identical results without mutating inputs or sharing state', () => {
    const saturated = [doneWorkoutAt(SINGLE.id, NOW, 2)]
    expect(fatigueOf(saturated, NOW)[SINGLE_SLUG]).toBe(1)

    const workouts = [
      doneWorkoutAt(SINGLE.id, NOW - 64 * HOUR),
      doneWorkoutAt(SINGLE.id, NOW - 40 * HOUR),
    ]
    const before = JSON.parse(JSON.stringify(workouts))
    const firstFatigue = fatigueOf(workouts, NOW)
    const firstStrength = strengthOf(workouts, NOW)
    const secondFatigue = fatigueOf(workouts, NOW)
    const secondStrength = strengthOf(workouts, NOW)

    expect(secondFatigue).toEqual(firstFatigue)
    expect(secondStrength).toEqual(firstStrength)
    expect(workouts).toEqual(before)
  })
})
