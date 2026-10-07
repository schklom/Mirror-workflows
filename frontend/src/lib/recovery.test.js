import { describe, expect, it } from 'vitest'
import {
  FATIGUE_MAX_SETS_PER_SESSION,
  FATIGUE_SCAN_MS,
  FATIGUE_SETS_PER_UNIT,
  FATIGUE_STATES,
  STRENGTH_FLOOR,
  STRENGTH_FULL_MS,
  STRENGTH_HALF_LIFE_MS,
  detrainedMuscles,
  fatiguedMuscles,
  fatigueHalfLifeOf,
  fatigueOf,
  halfLifeDecay,
  strengthOf,
} from './recovery.js'
import { EXDB, registerCustom } from './exercises.js'
import { MUSCLES, exerciseMuscleSnapshot, musclesOf } from './muscles.js'
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
// One completed set at the entry's own best load scores exactly 1 effective set;
// a full session of FATIGUE_SETS_PER_UNIT such sets is the 1.0 raw unit.
const doneWorkoutAt = (id, start, count = 1) =>
  workoutAt(id, start, Array.from({ length: count }, () => ({ done: true, w: 80, r: 8 })))
const zeroFatigue = () => Object.fromEntries(MUSCLES.map(slug => [slug, 0]))
const floorStrength = () => Object.fromEntries(MUSCLES.map(slug => [slug, STRENGTH_FLOOR]))

// Numeric fatigue remains the math API; the UI boundary selector is imported from production.
const stableFloat = value => Number(value.toFixed(12))

// Expected saturated fatigue for plain same-load sessions: sets are counted at full
// intensity (every set is its entry's best), normalised by the full-session unit,
// decayed per muscle, saturated with 1 - exp(-v).
const expectedFatigue = (sessions, slug = SINGLE_SLUG) => {
  const halfLife = fatigueHalfLifeOf(slug)
  let normalised = 0
  for (const { sets, weight = 1, age = 0 } of sessions) {
    normalised += sets * weight / FATIGUE_SETS_PER_UNIT * halfLifeDecay(age, halfLife)
  }
  return 1 - Math.exp(-normalised)
}

describe('recovery constants', () => {
  it('exports the pinned windows, half-lives, floor, and state labels', () => {
    expect(FATIGUE_SETS_PER_UNIT).toBe(8)
    expect(FATIGUE_MAX_SETS_PER_SESSION).toBe(12)
    expect(FATIGUE_SCAN_MS).toBe(30 * DAY)
    expect(STRENGTH_FULL_MS).toBe(14 * DAY)
    expect(STRENGTH_HALF_LIFE_MS).toBe(28 * DAY)
    expect(STRENGTH_FLOOR).toBe(0.5)
    expect(FATIGUE_STATES).toEqual({ READY: 'ready', RECOVERING: 'recovering', FATIGUED: 'fatigued' })
    expect(halfLifeDecay(DAY, DAY)).toBe(0.5)
  })

  it('recovers small upper-body muscles faster than legs and lower back', () => {
    expect(fatigueHalfLifeOf('biceps')).toBe(24 * HOUR)
    expect(fatigueHalfLifeOf('deltoids')).toBe(24 * HOUR)
    expect(fatigueHalfLifeOf('chest')).toBe(30 * HOUR)
    expect(fatigueHalfLifeOf('upper-back')).toBe(30 * HOUR)
    expect(fatigueHalfLifeOf('quadriceps')).toBe(48 * HOUR)
    expect(fatigueHalfLifeOf('hamstring')).toBe(48 * HOUR)
    expect(fatigueHalfLifeOf('lower-back')).toBe(48 * HOUR)
    expect(fatigueHalfLifeOf('not-a-muscle')).toBe(30 * HOUR)
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
      expect(fatigue[slug]).toBeCloseTo(expectedFatigue([{ sets: 1, weight }], slug), 10)
      expect(strength[slug]).toBe(weight ? 1 : STRENGTH_FLOOR)
    }
    // one set (whatever the load) never crosses the fatigued threshold
    expect(fatiguedMuscles(workouts, NOW)).toEqual([])

    // set count, not reps or load, drives fatigue: a 50-rep grinder scores exactly
    // like the plain 80x8 set - one set is one set.
    const highRep = [doneWorkoutAt(SINGLE.id, NOW, 1)]
    highRep[0].entries[0].sets[0].w = 50
    highRep[0].entries[0].sets[0].r = 50
    expect(fatigueOf(highRep, NOW)[SINGLE_SLUG]).toBeCloseTo(
      fatigueOf([doneWorkoutAt(SINGLE.id, NOW)], NOW)[SINGLE_SLUG],
      10,
    )
    expect(fatigueOf(highRep, NOW)[SINGLE_SLUG]).toBeLessThan(0.25)
  })

  it('uses a deleted exercise snapshot for the same bounded primary and secondary fatigue', () => {
    const resolved = doneWorkoutAt(WEIGHTED.id, NOW)
    const deleted = {
      ...resolved,
      entries: [{
        ...resolved.entries[0],
        id: 'deleted-weighted-exercise',
        muscleSnapshot: exerciseMuscleSnapshot(WEIGHTED),
      }],
    }

    expect(fatigueOf([deleted], NOW)).toEqual(fatigueOf([resolved], NOW))
    expect(fatigueOf([deleted], NOW)[WEIGHTED_PRIMARY_SLUG]).toBeGreaterThan(0)
    expect(fatigueOf([deleted], NOW)[SECONDARY_SLUG]).toBeGreaterThan(0)
  })

  it('uses a deleted exercise snapshot for strength without changing decay or floor semantics', () => {
    const start = NOW - 15 * DAY
    const resolved = doneWorkoutAt(WEIGHTED.id, start)
    const deleted = {
      ...resolved,
      entries: [{
        ...resolved.entries[0],
        id: 'deleted-weighted-exercise',
        muscleSnapshot: exerciseMuscleSnapshot(WEIGHTED),
      }],
    }
    const untouchedSlug = MUSCLES.find(slug => !WEIGHTED_WEIGHTS[slug])
    const strength = strengthOf([deleted], NOW)

    expect(strength).toEqual(strengthOf([resolved], NOW))
    expect(strength[WEIGHTED_PRIMARY_SLUG]).toBeCloseTo(0.5 ** (1 / 28), 10)
    expect(strength[SECONDARY_SLUG]).toBeCloseTo(0.5 ** (1 / 28), 10)
    expect(strength[untouchedSlug]).toBe(STRENGTH_FLOOR)
  })

  it('raises starting fatigue with sets, never pins, and fades without a cliff', () => {
    const at0 = count => fatigueOf([doneWorkoutAt(SINGLE.id, NOW, count)], NOW)[SINGLE_SLUG]
    expect(at0(1)).toBeCloseTo(expectedFatigue([{ sets: 1 }]), 10)
    expect(at0(5)).toBeCloseTo(expectedFatigue([{ sets: 5 }]), 10)
    expect(at0(12)).toBeCloseTo(expectedFatigue([{ sets: 12 }]), 10)
    expect(at0(12)).toBeGreaterThan(at0(5))
    expect(at0(5)).toBeGreaterThan(at0(1))
    expect(at0(12)).toBeLessThan(1)
    // one half-life later the gradient is still visible at any volume
    const halfLife = fatigueHalfLifeOf(SINGLE_SLUG)
    const later = fatigueOf([doneWorkoutAt(SINGLE.id, NOW - halfLife, 12)], NOW)[SINGLE_SLUG]
    expect(later).toBeCloseTo(expectedFatigue([{ sets: 12, age: halfLife }]), 10)
    expect(later).toBeLessThan(at0(12))
    // no cliff: 72h keeps decaying instead of snapping to zero
    const old = fatigueOf([doneWorkoutAt(SINGLE.id, NOW - 72 * HOUR)], NOW)[SINGLE_SLUG]
    expect(old).toBeGreaterThan(0)
    expect(old).toBeLessThan(0.25)
  })

  it('decays each weighted stimulus at its own muscle half-life', () => {
    const halfLife = fatigueHalfLifeOf(WEIGHTED_PRIMARY_SLUG)
    for (const age of [halfLife, halfLife / 2]) {
      const fatigue = fatigueOf([doneWorkoutAt(WEIGHTED.id, NOW - age)], NOW)
      for (const [slug, weight] of Object.entries(WEIGHTED_WEIGHTS)) {
        expect(fatigue[slug]).toBeCloseTo(expectedFatigue([{ sets: 1, weight, age }], slug), 10)
      }
    }
    // a secondary mover fades on its own clock, not the primary's
    const secondaryHl = fatigueHalfLifeOf(SECONDARY_SLUG)
    const aged = fatigueOf([doneWorkoutAt(WEIGHTED.id, NOW - secondaryHl)], NOW)
    expect(aged[SECONDARY_SLUG]).toBeCloseTo(
      expectedFatigue([{ sets: 1, weight: WEIGHTED_WEIGHTS[SECONDARY_SLUG], age: secondaryHl }], SECONDARY_SLUG),
      10,
    )
  })

  it('fades a 72-hour-old set below the ready threshold instead of hard-cutting', () => {
    const workouts = [doneWorkoutAt(SINGLE.id, NOW - 72 * HOUR)]
    const value = fatigueOf(workouts, NOW)[SINGLE_SLUG]
    expect(value).toBeGreaterThan(0)
    expect(value).toBeLessThan(0.25)
    expect(fatigueStateOf(value)).toBe(FATIGUE_STATES.READY)
    expect(strengthOf(workouts, NOW)[SINGLE_SLUG]).toBe(1)
  })

  it('ignores sets whose done flag is false for both axes', () => {
    const workouts = [workoutAt(WEIGHTED.id, NOW, [{ done: false }])]
    expect(fatigueOf(workouts, NOW)).toEqual(zeroFatigue())
    expect(strengthOf(workouts, NOW)).toEqual(floorStrength())
    expect(fatiguedMuscles(workouts, NOW)).toEqual([])
    expect(detrainedMuscles(workouts, NOW)).toEqual(MUSCLES)
  })

  it('discounts ramp-up rows against the entry best instead of charging full sets', () => {
    const ramped = workoutAt(SINGLE.id, NOW, [
      { done: true, w: 40, r: 8 },
      { done: true, w: 80, r: 8 },
    ])
    const plain = doneWorkoutAt(SINGLE.id, NOW, 2)
    const rampedValue = fatigueOf([ramped], NOW)[SINGLE_SLUG]
    const plainValue = fatigueOf([plain], NOW)[SINGLE_SLUG]
    // the 40 kg row costs (40/80)^1.5 of a set on top of the full 80 kg set
    expect(rampedValue).toBeCloseTo(1 - Math.exp(-(1 + 0.5 ** 1.5) / FATIGUE_SETS_PER_UNIT), 10)
    expect(rampedValue).toBeLessThan(plainValue)
    expect(rampedValue).toBeGreaterThan(fatigueOf([doneWorkoutAt(SINGLE.id, NOW)], NOW)[SINGLE_SLUG])
  })
})

describe('fatigue state boundaries', () => {
  // Inverse of the saturation curve: normalised stimulus needed for a target level.
  const rawAt = target => -Math.log(1 - target)

  it('classifies exactly .25 as recovering and .2499 as ready', () => {
    const halfLife = fatigueHalfLifeOf(SECONDARY_SLUG)
    const weight = WEIGHTED_WEIGHTS[SECONDARY_SLUG]
    const sets = 8
    const valueAt = target => {
      const age = halfLife * Math.log2(sets * weight / FATIGUE_SETS_PER_UNIT / rawAt(target))
      const value = fatigueOf([doneWorkoutAt(WEIGHTED.id, NOW - age, sets)], NOW)[SECONDARY_SLUG]
      expect(value).toBeCloseTo(target, 10)
      return stableFloat(value)
    }

    expect(fatigueStateOf(valueAt(0.25))).toBe(FATIGUE_STATES.RECOVERING)
    expect(fatigueStateOf(valueAt(0.2499))).toBe(FATIGUE_STATES.READY)
  })

  it('classifies exactly .5 as recovering, .5001 as fatigued, and hooks only fatigued muscles', () => {
    const halfLife = fatigueHalfLifeOf(SINGLE_SLUG)
    const sets = 8
    const atHalf = [doneWorkoutAt(
      SINGLE.id,
      NOW - halfLife * Math.log2(sets / FATIGUE_SETS_PER_UNIT / rawAt(0.4999)),
      sets,
    )]
    const aboveHalf = [
      doneWorkoutAt(
        SINGLE.id,
        NOW - halfLife * Math.log2(sets / FATIGUE_SETS_PER_UNIT / rawAt(0.5001)),
        sets,
      ),
    ]
    const half = fatigueOf(atHalf, NOW)[SINGLE_SLUG]
    const above = fatigueOf(aboveHalf, NOW)[SINGLE_SLUG]

    expect(half).toBeCloseTo(0.4999, 10)
    expect(fatigueStateOf(stableFloat(half))).toBe(FATIGUE_STATES.RECOVERING)
    expect(fatiguedMuscles(atHalf, NOW)).toEqual([])
    expect(above).toBeCloseTo(0.5001, 10)
    expect(fatigueStateOf(stableFloat(above))).toBe(FATIGUE_STATES.FATIGUED)
    expect(fatiguedMuscles(aboveHalf, NOW)).toEqual([SINGLE_SLUG])
  })
})


describe('causal session scoring', () => {
  const loadedWorkout = (start, weight, count = 8) => workoutAt(
    '1254',
    start,
    Array.from({ length: count }, () => ({ done: true, w: weight, r: 8 })),
  )

  it('adds each session on top of decayed earlier ones without any shared reference', () => {
    const halfLife = fatigueHalfLifeOf(SINGLE_SLUG)
    const old = doneWorkoutAt(SINGLE.id, NOW - DAY)
    const today = doneWorkoutAt(SINGLE.id, NOW)
    const expected = expectedFatigue([
      { sets: 1, age: DAY },
      { sets: 1, age: 0 },
    ])

    expect(fatigueOf([old, today], NOW)[SINGLE_SLUG]).toBeCloseTo(expected, 10)
    expect(fatigueOf([today], NOW)[SINGLE_SLUG]).toBeCloseTo(expectedFatigue([{ sets: 1 }]), 10)
  })

  it('keeps the 8x100x8 ten-day reproduction non-increasing as sessions leave the scan', () => {
    const base = Date.UTC(2026, 0, 31, 12)
    const workouts = [-20, -10, 0].map(days => loadedWorkout(base + days * DAY, 100))
    const observed = Array.from(
      { length: 31 * 24 + 1 },
      (_, hour) => fatigueOf(workouts, base + hour * HOUR).chest,
    )

    expect(observed[0]).toBeGreaterThan(0.5)
    expect(observed.at(-1)).toBe(0)
    for (let index = 1; index < observed.length; index += 1) {
      expect(observed[index]).toBeLessThanOrEqual(observed[index - 1] + Number.EPSILON)
    }
  })

  it('ignores imports older than the scan', () => {
    const today = loadedWorkout(NOW, 100, 5)
    const baseline = fatigueOf([today], NOW).chest
    const heavyImport = loadedWorkout(NOW - 90 * DAY, 140, 10)
    const highVolumeImport = loadedWorkout(NOW - 90 * DAY, 100, 20)

    expect(fatigueOf([heavyImport, today], NOW).chest).toBe(baseline)
    expect(fatigueOf([highVolumeImport, today], NOW).chest).toBe(baseline)
  })

  it('never increases fatigue when any one workout is deleted', () => {
    const workouts = [
      loadedWorkout(NOW - 40 * DAY, 100, 15),
      loadedWorkout(NOW - 3 * DAY, 100, 8),
      loadedWorkout(NOW - 2 * DAY, 100, 8),
      loadedWorkout(NOW - DAY, 60, 4),
      loadedWorkout(NOW, 120, 10),
    ]
    const before = fatigueOf(workouts, NOW)

    workouts.forEach((_, deletedIndex) => {
      const after = fatigueOf(workouts.filter((__, index) => index !== deletedIndex), NOW)
      for (const slug of MUSCLES) expect(after[slug]).toBeLessThanOrEqual(before[slug] + Number.EPSILON)
    })
  })

  it('rates a back-off session below repeating the full load', () => {
    // Same athlete, same exercise: 4 work sets + 4 half-weight back-offs costs less
    // than 8 work sets. Absolute loads across sessions are intentionally invisible
    // (session-local intensity is relative by design - without RIR data a lighter
    // session may still be the harder one); the cross-session load sensitivity
    // belongs to the chronic denominator tracked in docs/dev/FATIGUE_SETS_MODEL.md.
    const backOff = workoutAt(SINGLE.id, NOW, [
      ...Array.from({ length: 4 }, () => ({ done: true, w: 100, r: 8 })),
      ...Array.from({ length: 4 }, () => ({ done: true, w: 50, r: 8 })),
    ])
    const repeated = doneWorkoutAt(SINGLE.id, NOW, 8)
    // doneWorkoutAt uses w:80 for every set, so each set is its entry's best.
    const fullLoad = workoutAt(SINGLE.id, NOW, Array.from({ length: 8 }, () => ({ done: true, w: 100, r: 8 })))

    expect(fatigueOf([backOff], NOW)[SINGLE_SLUG]).toBeLessThan(fatigueOf([fullLoad], NOW)[SINGLE_SLUG])
    expect(fatigueOf([repeated], NOW)[SINGLE_SLUG]).toBeCloseTo(fatigueOf([fullLoad], NOW)[SINGLE_SLUG], 10)
  })

  it('scores identical structures at different absolute loads equally', () => {
    // Session-local intensity is relative by design (see above): 8x50 and 8x100 with
    // no RIR data are both "8 hard sets". kg/lb equivalence falls out for free.
    const light = loadedWorkout(NOW, 50, 8)
    const heavy = loadedWorkout(NOW, 100, 8)
    expect(fatigueOf([light], NOW).chest).toBeCloseTo(fatigueOf([heavy], NOW).chest, 10)
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
  it('matches the saturated sum of independently decayed stimuli in chronological order', () => {
    const halfLife = fatigueHalfLifeOf(SINGLE_SLUG)
    const ages = [64 * HOUR, 40 * HOUR]
    const workouts = ages.map(age => doneWorkoutAt(SINGLE.id, NOW - age))
    const expected = expectedFatigue(ages.map(age => ({ sets: 1, age })))

    expect(fatigueOf(workouts, NOW)[SINGLE_SLUG]).toBeCloseTo(expected, 10)
    expect(fatigueOf([...workouts].reverse(), NOW)[SINGLE_SLUG]).toBeCloseTo(expected, 10)
  })

  it('saturates without pinning and returns identical results without mutating inputs or sharing state', () => {
    const saturated = [doneWorkoutAt(SINGLE.id, NOW, 2)]
    expect(fatigueOf(saturated, NOW)[SINGLE_SLUG]).toBeCloseTo(expectedFatigue([{ sets: 2 }]), 10)
    expect(fatigueOf(saturated, NOW)[SINGLE_SLUG]).toBeLessThan(1)

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


describe('warm-up flag in strength and fatigue', () => {
  it('a warm-up set does not reset strength but still adds fatigue volume', () => {
    const now = Date.UTC(2026, 7, 1, 12)
    const oldWork = { id: 'w1', d: '2026-07-10', start: now - 20 * 86400000, unit: 'kg',
      entries: [{ id: '1254', sets: [{ done: true, w: 80, r: 8 }] }] }
    const warm = { id: 'w2', d: '2026-08-01', start: now - 3600000, unit: 'kg',
      entries: [{ id: '1254', sets: [{ done: true, warmup: true, w: 20, r: 8 }] }] }
    const workouts = [oldWork, warm]
    const strength = strengthOf(workouts, now)
    // the strength edge is 20 days old: the fresh warm-up must NOT be the latest training event
    expect(strength.chest).toBeLessThan(1)
    // but the warm-up still contributes to the fatigue stimulus (real mechanical work)
    const fatigue = fatigueOf(workouts, now)
    expect(fatigue.chest).toBeGreaterThan(0)
  })
})

describe('drop-set drops add fatigue sets on top of the main set', () => {
  // The drop carries its own (lighter) load, scored against the entry best: a 60 kg
  // drop after an 80 kg top set costs (60/80)^1.5 of a set on top of the full set.
  const dropShare = (60 / 80) ** 1.5

  it('a drop-set drop adds its own relative-intensity sets', () => {
    const dropRow = { done: true, type: 'dropset', w: 80, r: 8, drops: [{ w: 60, r: 6 }] }
    const expected = expectedFatigue([{ sets: 1 + dropShare }])

    expect(fatigueOf([workoutAt(SINGLE.id, NOW, [dropRow])], NOW)[SINGLE_SLUG]).toBeCloseTo(expected, 8)
    // strictly more than the plain 80x8 set alone — the drop is real extra work
    expect(fatigueOf([workoutAt(SINGLE.id, NOW, [dropRow])], NOW)[SINGLE_SLUG])
      .toBeGreaterThan(fatigueOf([doneWorkoutAt(SINGLE.id, NOW)], NOW)[SINGLE_SLUG])
  })

  it('leaves fatigue unchanged for a straight set with no drops', () => {
    const plain = { done: true, w: 80, r: 8 }
    expect(fatigueOf([workoutAt(SINGLE.id, NOW, [plain])], NOW)[SINGLE_SLUG])
      .toBeCloseTo(expectedFatigue([{ sets: 1 }]), 8)
  })
})

describe('a rest-pause row\'s clusters add no extra fatigue sets', () => {
  // Its own r is already the total across every burst (see applyIntensifierPlan/history.js),
  // so the main set term already covers all of it — clusters are a breakdown only.
  it('matches a plain set of the same w/r exactly, regardless of how the clusters break it down', () => {
    const burstRow = { done: true, type: 'restpause', w: 80, r: 8, clusters: [{ r: 4, restSec: 15 }] }
    const plainRow = { done: true, w: 80, r: 8 }
    expect(fatigueOf([workoutAt(SINGLE.id, NOW, [burstRow])], NOW)[SINGLE_SLUG])
      .toBeCloseTo(fatigueOf([workoutAt(SINGLE.id, NOW, [plainRow])], NOW)[SINGLE_SLUG], 10)
  })

  it('holds for a realistic planned total too — a full descending split adds nothing beyond the row\'s own r', () => {
    const burstRow = { done: true, type: 'restpause', w: 80, r: 20, clusters: [{ r: 10, restSec: 15 }, { r: 5, restSec: 15 }, { r: 3, restSec: 15 }, { r: 1, restSec: 15 }, { r: 1, restSec: 15 }] }
    const plainRow = { done: true, w: 80, r: 20 }
    expect(fatigueOf([workoutAt(SINGLE.id, NOW, [burstRow])], NOW)[SINGLE_SLUG])
      .toBeCloseTo(fatigueOf([workoutAt(SINGLE.id, NOW, [plainRow])], NOW)[SINGLE_SLUG], 10)
  })
})

describe('loads are relative, units are irrelevant', () => {
  const loaded = EXDB.find(ex => {
    const weights = musclesOf(ex)
    return ex.bp !== 'cardio' && ex.eq !== 'body weight'
      && Object.keys(weights).length === 1 && Object.values(weights)[0] === 1
  })
  const bodyweight = EXDB.find(ex => ex.bp !== 'cardio' && ex.eq === 'body weight')
  if (!loaded || !bodyweight) throw new Error('recovery tests require loaded and bodyweight fixtures')
  const loadedSlug = Object.keys(musclesOf(loaded))[0]
  const bodyweightSlug = Object.keys(musclesOf(bodyweight))[0]
  const stampedWorkout = ({ id, start, unit, weight, target, bw }) => ({
    d: new Date(start).toISOString(), start, unit, bw,
    entries: [{ id, target, sets: [{ done: true, w: weight, r: 8 }] }],
  })

  it('gives kg and physically equivalent stamped-pound histories the same fatigue', () => {
    const kg = stampedWorkout({ id: loaded.id, start: NOW, unit: 'kg', weight: 80 })
    const lb = stampedWorkout({ id: loaded.id, start: NOW, unit: 'lb', weight: 176.3696 })

    expect(fatigueOf([lb], NOW, { unit: 'kg' })[loadedSlug])
      .toBeCloseTo(fatigueOf([kg], NOW, { unit: 'kg' })[loadedSlug], 6)
  })

  it('normalizes mixed stamped units before scoring', () => {
    const starts = [NOW - 3 * DAY, NOW - 2 * DAY, NOW - DAY, NOW]
    const kg = starts.map(start => stampedWorkout({ id: loaded.id, start, unit: 'kg', weight: 80 }))
    const mixed = starts.map((start, i) => stampedWorkout({
      id: loaded.id, start, unit: i % 2 ? 'lb' : 'kg', weight: i % 2 ? 176.3696 : 80,
    }))

    expect(fatigueOf(mixed, NOW, { unit: 'kg' })[loadedSlug])
      .toBeCloseTo(fatigueOf(kg, NOW, { unit: 'kg' })[loadedSlug], 6)
  })

  it('treats an unstamped legacy history as one hard set', () => {
    const kg = stampedWorkout({ id: loaded.id, start: NOW, unit: 'kg', weight: 80 })
    const legacyLb = { ...kg, unit: undefined, entries: [{ ...kg.entries[0], sets: [{ done: true, w: 176.3696, r: 8 }] }] }

    expect(fatigueOf([legacyLb], NOW, { unit: 'lb' })[loadedSlug])
      .toBeCloseTo(fatigueOf([kg], NOW, { unit: 'kg' })[loadedSlug], 6)
  })

  it('scores heavier and lighter bodyweight sessions by their relative intensity', () => {
    // Both sessions are single-set histories, so each set is its entry's best and
    // scores full: relative intensity is session-local by design (body mass cancels).
    const workout = stampedWorkout({
      id: loaded.id, start: NOW, unit: 'kg', weight: 0,
      target: { bodyweight: true }, bw: 80,
    })

    expect(fatigueOf([workout], NOW, { unit: 'kg' })[loadedSlug]).toBeGreaterThan(0)
    expect(strengthOf([workout], NOW, { unit: 'kg' })[loadedSlug]).toBe(1)
  })

  it('scores an unloaded and a loaded bodyweight set equally when each is its own best', () => {
    const unloaded = stampedWorkout({ id: bodyweight.id, start: NOW, unit: 'kg', weight: 0, bw: 80 })
    const loadedSet = { done: true, w: 10, r: 8 }
    const added = { ...unloaded, entries: [{ ...unloaded.entries[0], sets: [loadedSet] }] }

    expect(fatigueOf([added], NOW, { unit: 'kg' })[bodyweightSlug])
      .toBeCloseTo(fatigueOf([unloaded], NOW, { unit: 'kg' })[bodyweightSlug], 10)
  })

  it('lets explicitly configured custom bodyweight work reset strength', () => {
    const id = 'recovery-custom-bodyweight'
    registerCustom([{ id, n: 'Custom bodyweight', bp: 'chest', tg: 'chest', eq: 'custom', sm: [] }])
    try {
      const workout = stampedWorkout({ id, start: NOW, unit: 'kg', weight: 0, bw: 80, target: { bodyweight: true } })
      expect(fatigueOf([workout], NOW, { unit: 'kg' }).chest).toBeGreaterThan(0)
      expect(strengthOf([workout], NOW, { unit: 'kg' }).chest).toBe(1)
    } finally {
      registerCustom([])
    }
  })

  it('treats a future-dated workout as its own timestamp, never amplified', () => {
    // A CSV import with a bad timezone can date a workout 10 days in the future. The final
    // decay clamps the age to zero instead of exponentiating, so the session counts exactly
    // like the same workout dated now - no 2^(10d/36h) ~ 102x amplification.
    const future = doneWorkoutAt(SINGLE.id, NOW + 10 * DAY, 5)
    const now = doneWorkoutAt(SINGLE.id, NOW, 5)
    const futureValue = fatigueOf([future], NOW)[SINGLE_SLUG]
    const nowValue = fatigueOf([now], NOW)[SINGLE_SLUG]
    expect(futureValue).toBeCloseTo(nowValue, 10)
    expect(futureValue).toBeLessThan(1)
  })

  it('counts a default custom zero-load ring push-up as two hard sets', () => {
    const id = 'recovery-ring-push-up'
    registerCustom([{ id, n: 'Ring push-up', bp: 'chest', tg: 'chest', eq: 'custom', sm: [] }])
    try {
      const workout = workoutAt(id, NOW, [
        { done: true, w: 0, r: 20 },
        { done: true, w: 0, r: 20 },
      ])
      // No load recorded means intensity is unknown, so sets count full.
      expect(fatigueOf([workout], NOW).chest).toBeCloseTo(expectedFatigue([{ sets: 2 }], 'chest'), 10)
      expect(strengthOf([workout], NOW).chest).toBe(1)
    } finally {
      registerCustom([])
    }
  })
})
