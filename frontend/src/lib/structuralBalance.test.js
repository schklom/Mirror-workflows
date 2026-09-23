import { describe, expect, it } from 'vitest'
import { computeBalance, classify, ratioFor, resolveCurrent, resolveCurrentReps, targetFor, overrideKey } from './structuralBalance.js'
import { TEMPLATES, EVALUATION_MODES, BALANCE_STATUSES, BORDERLINE_BAND_PCT } from './structuralBalanceTemplates.js'

const NOW = Date.parse('2026-01-15T00:00:00Z')

const workoutAt = (id, start, sets) => ({
  d: new Date(start).toISOString(),
  start,
  entries: [{ id, sets }],
})
const setDone = (w, r) => ({ done: true, w, r })

const findRole = (template, roleId) => template.roles.find(r => r.id === roleId)

describe('classify', () => {
  it('is balanced at or above target, borderline within the band, weak further below, no-data otherwise', () => {
    expect(classify(75, 75)).toBe(BALANCE_STATUSES.BALANCED)
    expect(classify(80, 75)).toBe(BALANCE_STATUSES.BALANCED)
    expect(classify(70, 75)).toBe(BALANCE_STATUSES.BORDERLINE) // exactly at the 5-point edge
    expect(classify(69.9, 75)).toBe(BALANCE_STATUSES.WEAK)
    expect(classify(50, 75)).toBe(BALANCE_STATUSES.WEAK)
    expect(classify(null, 75)).toBe(BALANCE_STATUSES.NO_DATA)
    expect(classify(NaN, 75)).toBe(BALANCE_STATUSES.NO_DATA)
  })
})

describe('computeBalance — load-ratio mode (Thibaudeau powerlifting)', () => {
  const template = TEMPLATES.thibaudeauPowerlifting

  it('balanced/borderline/weak edges for a non-anchor role', () => {
    const S = (benchW) => ({
      unit: 'kg',
      workouts: [
        workoutAt('0043', NOW - 1000, [setDone(100, 1)]), // squat anchor: 100kg 1RM
        workoutAt('0025', NOW, [setDone(benchW, 1)]),
      ],
    })
    const bench = template.roles.find(r => r.id === 'bench') // targetPct 75

    let results = computeBalance(S(75), template)
    expect(results.find(r => r.roleId === 'bench').status).toBe(BALANCE_STATUSES.BALANCED)
    expect(results.find(r => r.roleId === 'bench').actualPct).toBeCloseTo(75)

    results = computeBalance(S(70), template) // exactly BORDERLINE_BAND_PCT under target
    expect(results.find(r => r.roleId === 'bench').status).toBe(BALANCE_STATUSES.BORDERLINE)

    results = computeBalance(S(69), template)
    expect(results.find(r => r.roleId === 'bench').status).toBe(BALANCE_STATUSES.WEAK)
  })

  it('scores the anchor role itself at 100% whenever it has any data, and no-data when it has none', () => {
    const withSquat = computeBalance({ unit: 'kg', workouts: [workoutAt('0043', NOW, [setDone(120, 1)])] }, template)
    const squat = withSquat.find(r => r.roleId === 'squat')
    expect(squat.actualPct).toBeCloseTo(100)
    expect(squat.status).toBe(BALANCE_STATUSES.BALANCED)

    const withoutSquat = computeBalance({ unit: 'kg', workouts: [] }, template)
    expect(withoutSquat.find(r => r.roleId === 'squat').status).toBe(BALANCE_STATUSES.NO_DATA)
  })

  it('a non-anchor role is no-data when the anchor itself has no data, even if the role does', () => {
    const S = { unit: 'kg', workouts: [workoutAt('0025', NOW, [setDone(80, 1)])] } // bench logged, squat never
    const results = computeBalance(S, template)
    expect(results.find(r => r.roleId === 'bench').status).toBe(BALANCE_STATUSES.NO_DATA)
    expect(results.find(r => r.roleId === 'bench').actualPct).toBe(null)
  })

  it('no-data when the role itself was never logged', () => {
    const S = { unit: 'kg', workouts: [workoutAt('0043', NOW, [setDone(100, 1)])] } // squat only
    const results = computeBalance(S, template)
    const bench = results.find(r => r.roleId === 'bench')
    expect(bench.status).toBe(BALANCE_STATUSES.NO_DATA)
    expect(bench.current).toBe(null)
  })
})

describe('computeBalance — bodyweight-ratio mode (ATG)', () => {
  const template = TEMPLATES.atg

  const sWithBw = (bwKg, rdlW) => ({
    unit: 'kg',
    body: 'male',
    bodyweight: [{ d: '2026-01-01', w: bwKg }],
    workouts: [workoutAt('0085', NOW, [setDone(rdlW, 1)])],
  })

  it('balanced/borderline/weak edges against bodyweight (male target 100%)', () => {
    let results = computeBalance(sWithBw(80, 80), template)
    expect(results.find(r => r.roleId === 'romanianDeadlift').status).toBe(BALANCE_STATUSES.BALANCED)

    results = computeBalance(sWithBw(80, 76), template) // 95% -> exactly borderline edge
    expect(results.find(r => r.roleId === 'romanianDeadlift').status).toBe(BALANCE_STATUSES.BORDERLINE)

    results = computeBalance(sWithBw(80, 75), template) // 93.75% -> weak
    expect(results.find(r => r.roleId === 'romanianDeadlift').status).toBe(BALANCE_STATUSES.WEAK)
  })

  it('uses the female target when S.body is female', () => {
    const S = { ...sWithBw(80, 64), body: 'female' } // 80% of 80kg = 64kg -> exactly female target (80%)
    const results = computeBalance(S, template)
    expect(results.find(r => r.roleId === 'romanianDeadlift').status).toBe(BALANCE_STATUSES.BALANCED)
    expect(results.find(r => r.roleId === 'romanianDeadlift').targetPct).toBe(80)
  })

  it('no-data when bodyweight was never logged', () => {
    const S = { unit: 'kg', workouts: [workoutAt('0085', NOW, [setDone(80, 1)])], bodyweight: [] }
    const results = computeBalance(S, template)
    expect(results.find(r => r.roleId === 'romanianDeadlift').status).toBe(BALANCE_STATUSES.NO_DATA)
  })
})

describe('computeBalance — rep-count mode (ATG)', () => {
  const template = TEMPLATES.atg

  it('scores pure-bodyweight sets (w=0) correctly — the best1RM()-only bug this engine avoids', () => {
    const S = { unit: 'kg', workouts: [workoutAt('0652', NOW, [setDone(0, 10)])] } // 10 strict pull-ups, no added weight
    const results = computeBalance(S, template)
    const pullups = results.find(r => r.roleId === 'pullups')
    expect(pullups.status).toBe(BALANCE_STATUSES.BALANCED)
    expect(pullups.actualPct).toBeCloseTo(100)
  })

  it('uses the female rep target (1 rep) for pull-ups', () => {
    const S = { unit: 'kg', body: 'female', workouts: [workoutAt('0652', NOW, [setDone(0, 1)])] }
    const results = computeBalance(S, template)
    expect(results.find(r => r.roleId === 'pullups').status).toBe(BALANCE_STATUSES.BALANCED)
  })

  it('no-data when the exercise was never logged (glute-ham raise / Nordic curl role)', () => {
    const S = { unit: 'kg', workouts: [] }
    const results = computeBalance(S, template)
    const nordic = results.find(r => r.roleId === 'nordicCurl')
    expect(nordic.status).toBe(BALANCE_STATUSES.NO_DATA)
    expect(nordic.mappedExerciseId).toBe(null)
  })

  it('balanced/borderline/weak edges use a synthetic larger rep target, since real ATG targets (1/10) are too small for a clean 5-point band', () => {
    const role = { id: 'synthetic', evaluationMode: EVALUATION_MODES.REP_COUNT, exerciseIds: ['0652'], repsTarget: 20 }
    const template20 = { id: 'synthetic-template', roles: [role] }
    const build = r => ({ unit: 'kg', workouts: [workoutAt('0652', NOW, [setDone(0, r)])] })

    expect(computeBalance(build(20), template20)[0].status).toBe(BALANCE_STATUSES.BALANCED)
    expect(computeBalance(build(19), template20)[0].status).toBe(BALANCE_STATUSES.BORDERLINE) // 95%
    expect(computeBalance(build(18), template20)[0].status).toBe(BALANCE_STATUSES.WEAK) // 90%
  })
})

describe('resolveCurrent / resolveCurrentReps — best variant among a whitelist wins', () => {
  it('load-ratio: picks the exercise id with the higher estimate, not the first-listed or most recent', () => {
    const S = {
      unit: 'kg',
      workouts: [
        workoutAt('0841', NOW - 1000, [setDone(20, 5)]), // weighted pull-up: higher est
        workoutAt('0841', NOW, [setDone(10, 5)]), // weighted pull-up: lower est, more recent
      ],
    }
    const current = resolveCurrent(S, ['0032', '0841'], null)
    expect(current.exId).toBe('0841')
    expect(current.w).toBe(20)
  })

  it('rep-count: picks the higher rep count among whitelisted ids', () => {
    const S = {
      unit: 'kg',
      workouts: [
        workoutAt('0652', NOW - 1000, [setDone(0, 8)]),
        workoutAt('0841', NOW, [setDone(5, 6)]),
      ],
    }
    const current = resolveCurrentReps(S, ['0652', '0841'])
    expect(current.r).toBe(8)
    expect(current.exId).toBe('0652')
  })

  it('returns null for an empty whitelist without throwing', () => {
    expect(resolveCurrent({ unit: 'kg', workouts: [] }, [], null)).toBe(null)
    expect(resolveCurrentReps({ unit: 'kg', workouts: [] }, [])).toBe(null)
  })
})

// The bug this whole block exists for: `w` on a bodyweight exercise is what was *added* to the
// lifter, so scoring a dip or a pull-up on `w` alone reported a +10 kg chin-up as a 10 kg lift —
// which turned a lifter who is balanced on Poliquin's table into "weak" by 80 points.
describe('bodyweight exercises count the lifter, not just the belt', () => {
  const template = TEMPLATES.poliquin
  const bwLifter = sets => ({
    unit: 'kg',
    bodyweight: [{ d: '2026-01-01', w: 80 }],
    workouts: [{
      d: '2026-01-10', start: NOW,
      entries: [{ id: '0030', sets: [setDone(100, 1)] }, ...sets], // close-grip bench anchor at 100 kg
    }],
  })

  it('adds bodyweight to the added load on a bodyweight entry', () => {
    // +10 kg on an 80 kg lifter is a 90 kg pull-up — 90% of a 100 kg bench, over the 87% target.
    const S = bwLifter([{ id: '0652', sets: [setDone(10, 1)] }])
    const pullups = computeBalance(S, template).find(r => r.roleId === 'supinePullups')
    expect(pullups.actualPct).toBeCloseTo(90)
    expect(pullups.status).toBe(BALANCE_STATUSES.BALANCED)
  })

  it('scores an unloaded bodyweight set as the lifter’s own mass', () => {
    const S = bwLifter([{ id: '0251', sets: [setDone(0, 1)] }])
    const dips = computeBalance(S, template).find(r => r.roleId === 'dips')
    expect(dips.actualPct).toBeCloseTo(80) // 80 kg of lifter against a 100 kg bench
    expect(dips.status).toBe(BALANCE_STATUSES.WEAK) // target is 117%
  })

  it('prefers the weigh-in stamped on the session over the profile’s current bodyweight', () => {
    const S = bwLifter([{ id: '0652', sets: [setDone(0, 1)] }])
    S.workouts[0].bw = 70 // the lifter weighed 70 kg that day, not the 80 kg on file now
    const pullups = computeBalance(S, template).find(r => r.roleId === 'supinePullups')
    expect(pullups.actualPct).toBeCloseTo(70)
  })

  it('leaves a bodyweight entry unscored when no bodyweight is known, rather than inventing one', () => {
    const S = { unit: 'kg', workouts: [{ d: '2026-01-10', start: NOW, entries: [
      { id: '0030', sets: [setDone(100, 1)] },
      { id: '0652', sets: [setDone(10, 1)] },
    ] }] }
    const pullups = computeBalance(S, template).find(r => r.roleId === 'supinePullups')
    expect(pullups.status).toBe(BALANCE_STATUSES.NO_DATA)
  })

  it('honours the per-exercise bodyweight flag over the equipment default', () => {
    // A barbell lift the user flagged as bodyweight (a dip machine logged under a barbell id, say)
    // counts their mass; the flag turned off on a bodyweight exercise stops it counting.
    const flagged = bwLifter([{ id: '0032', target: { bodyweight: true }, sets: [setDone(20, 1)] }])
    const deadlift = computeBalance(flagged, template).find(r => r.roleId === 'deadlift')
    expect(deadlift.current.estKg).toBeCloseTo(100) // 80 + 20, not 20

    const unflagged = bwLifter([{ id: '0652', target: { bodyweight: false }, sets: [setDone(20, 1)] }])
    const pullups = computeBalance(unflagged, template).find(r => r.roleId === 'supinePullups')
    expect(pullups.current.estKg).toBeCloseTo(20)
  })
})

// A role pointed at an assistance machine through the exercise picker (0017 assisted pull-up):
// the logged number is the help, so it comes off the lifter instead of going on top.
describe('an assistance machine counts the help against the lifter', () => {
  const ASSISTED = '0017' // assisted pull-up, a leverage machine
  const poliquin = TEMPLATES.poliquin
  const pullRole = findRole(poliquin, 'supinePullups')
  const lifter = (entry, extra = {}) => ({
    unit: 'kg',
    bodyweight: [{ d: '2026-01-01', w: 80 }],
    balanceOverrides: { [overrideKey(poliquin, pullRole)]: ASSISTED },
    workouts: [{ d: '2026-01-10', start: NOW, entries: [{ id: '0030', sets: [setDone(100, 1)] }, entry] }],
    ...extra,
  })
  const pullups = S => computeBalance(S, poliquin).find(r => r.roleId === 'supinePullups')

  it('scores body weight minus the help', () => {
    const row = pullups(lifter({ id: ASSISTED, sets: [setDone(20, 1)] }))
    expect(row.mappedExerciseId).toBe(ASSISTED)
    expect(row.current.estKg).toBeCloseTo(60) // 80 kg lifter, 20 kg of help
    expect(row.actualPct).toBeCloseTo(60)
    expect(row.status).toBe(BALANCE_STATUSES.WEAK) // 87% target
  })

  it('reads less help as the stronger set, not more', () => {
    const row = pullups(lifter({ id: ASSISTED, sets: [setDone(40, 1), setDone(10, 1)] }))
    expect(row.current.estKg).toBeCloseTo(70)
    expect(row.current.w).toBe(10)
  })

  it('still subtracts when the entry is flagged bodyweight', () => {
    const row = pullups(lifter({ id: ASSISTED, target: { bodyweight: true }, sets: [setDone(20, 1)] }))
    expect(row.current.estKg).toBeCloseTo(60) // not 80 + 20
  })

  it('uses the weigh-in stamped on the session, and converts a lb profile', () => {
    const stamped = lifter({ id: ASSISTED, sets: [setDone(20, 1)] })
    stamped.workouts[0].bw = 70
    expect(pullups(stamped).current.estKg).toBeCloseTo(50)

    const lb = lifter({ id: ASSISTED, sets: [setDone(44.09, 1)] }, { unit: 'lb', bodyweight: [{ d: '2026-01-01', w: 176.37 }] })
    lb.workouts[0].entries[0].sets = [setDone(220.46, 1)] // the 100 kg anchor in lb
    expect(pullups(lb).actualPct).toBeCloseTo(60, 0)
  })

  it('leaves a set unscored with no help entered, help at or above body weight, or no body weight', () => {
    expect(pullups(lifter({ id: ASSISTED, sets: [setDone(0, 5)] })).status).toBe(BALANCE_STATUSES.NO_DATA)
    expect(pullups(lifter({ id: ASSISTED, sets: [setDone(80, 5)] })).status).toBe(BALANCE_STATUSES.NO_DATA)
    expect(pullups(lifter({ id: ASSISTED, sets: [setDone(20, 1)] }, { bodyweight: [] })).status).toBe(BALANCE_STATUSES.NO_DATA)
  })

  it('does not count helped reps toward a body-weight rep target', () => {
    const atg = TEMPLATES.atg
    const key = overrideKey(atg, findRole(atg, 'pullups'))
    const S = { unit: 'kg', balanceOverrides: { [key]: ASSISTED }, workouts: [workoutAt(ASSISTED, NOW, [setDone(30, 12)])] }
    const row = computeBalance(S, atg).find(r => r.roleId === 'pullups')
    expect(row.isOverridden).toBe(true)
    expect(row.status).toBe(BALANCE_STATUSES.NO_DATA)
    expect(resolveCurrentReps(S, [ASSISTED])).toBe(null)
  })
})

describe('rep-count on a unilateral set', () => {
  it('reads the better side, not the both-sides total', () => {
    // workout-model.js keeps `r` as L.r + R.r on a per-side row; a "10 reps" target is per limb.
    const S = { unit: 'kg', workouts: [workoutAt('0652', NOW, [
      { done: true, w: 0, r: 12, sides: { L: { r: 5, done: true }, R: { r: 7, done: true } } },
    ])] }
    const current = resolveCurrentReps(S, ['0652'])
    expect(current.r).toBe(7)
  })
})

describe('unit consistency (lb profile)', () => {
  it('bodyweight-ratio gives the same result in lb as in kg', () => {
    const kgResult = computeBalance({
      unit: 'kg', body: 'male',
      bodyweight: [{ d: '2026-01-01', w: 80 }],
      workouts: [workoutAt('0085', NOW, [setDone(80, 1)])],
    }, TEMPLATES.atg).find(r => r.roleId === 'romanianDeadlift')

    const lbResult = computeBalance({
      unit: 'lb', body: 'male',
      bodyweight: [{ d: '2026-01-01', w: 176.37 }], // ~80kg in lb
      workouts: [workoutAt('0085', NOW, [setDone(176.37, 1)])],
    }, TEMPLATES.atg).find(r => r.roleId === 'romanianDeadlift')

    expect(lbResult.actualPct).toBeCloseTo(kgResult.actualPct, 0)
  })
})

describe('exercise override', () => {
  const template = TEMPLATES.atg
  const nordicRole = findRole(template, 'nordicCurl')

  it('reads from the overridden exercise instead of the curated whitelist, and flags isOverridden', () => {
    const key = overrideKey(template, nordicRole)
    const S = {
      unit: 'kg',
      balanceOverrides: { [key]: '0599' }, // a machine leg curl instead of the default glute-ham raise
      workouts: [workoutAt('0599', NOW, [setDone(40, 1)])],
    }
    const results = computeBalance(S, template)
    const nordic = results.find(r => r.roleId === 'nordicCurl')
    expect(nordic.isOverridden).toBe(true)
    expect(nordic.mappedExerciseId).toBe('0599')
  })

  it('is not overridden and uses the curated whitelist when no override is set', () => {
    const results = computeBalance({ unit: 'kg', workouts: [] }, template)
    expect(results.find(r => r.roleId === 'nordicCurl').isOverridden).toBe(false)
  })

  it('clearing the override reverts to the curated whitelist', () => {
    const key = overrideKey(template, nordicRole)
    const withOverride = { unit: 'kg', balanceOverrides: { [key]: '0599' }, workouts: [workoutAt('3193', NOW, [setDone(0, 1)])] }
    const overridden = computeBalance(withOverride, template).find(r => r.roleId === 'nordicCurl')
    expect(overridden.status).toBe(BALANCE_STATUSES.NO_DATA) // logged the default exercise, but override points elsewhere

    const { balanceOverrides, ...withoutOverride } = withOverride
    const reverted = computeBalance(withoutOverride, template).find(r => r.roleId === 'nordicCurl')
    expect(reverted.isOverridden).toBe(false)
    expect(reverted.status).toBe(BALANCE_STATUSES.BALANCED) // now reads the logged glute-ham raise set again
  })
})

describe('computeBalance — full template end-to-end (Poliquin)', () => {
  it('resolves every role in order, mixing logged and unlogged roles', () => {
    const template = TEMPLATES.poliquin
    const S = {
      unit: 'kg',
      bodyweight: [{ d: '2026-01-01', w: 80 }],
      workouts: [
        workoutAt('0030', NOW - 5000, [setDone(100, 1)]), // narrowBench anchor: 100kg
        workoutAt('0047', NOW - 4000, [setDone(91, 1)]), // inclineBench: exactly 91% -> balanced
        workoutAt('0251', NOW - 3000, [setDone(37, 1)]), // dips: 80kg lifter + 37 = 117% -> balanced
        // supinePullups: deliberately never logged
        workoutAt('0031', NOW - 2000, [setDone(30, 1)]), // barbellCurl: 30% -> weak (target 40)
        workoutAt('1436', NOW - 1000, [setDone(150, 1)]), // highBarSquat anchor: 150kg
        workoutAt('0042', NOW, [setDone(127.5, 1)]), // frontSquat: 85% -> balanced
      ],
    }
    const results = computeBalance(S, template)

    expect(results.map(r => r.roleId)).toEqual(template.roles.map(r => r.id))
    expect(results.find(r => r.roleId === 'narrowBench').status).toBe(BALANCE_STATUSES.BALANCED)
    expect(results.find(r => r.roleId === 'inclineBench').status).toBe(BALANCE_STATUSES.BALANCED)
    expect(results.find(r => r.roleId === 'dips').status).toBe(BALANCE_STATUSES.BALANCED)
    expect(results.find(r => r.roleId === 'supinePullups').status).toBe(BALANCE_STATUSES.NO_DATA)
    expect(results.find(r => r.roleId === 'barbellCurl').status).toBe(BALANCE_STATUSES.WEAK)
    expect(results.find(r => r.roleId === 'highBarSquat').status).toBe(BALANCE_STATUSES.BALANCED)
    expect(results.find(r => r.roleId === 'frontSquat').status).toBe(BALANCE_STATUSES.BALANCED)
    expect(results.find(r => r.roleId === 'deadlift').status).toBe(BALANCE_STATUSES.NO_DATA)
    expect(results.find(r => r.roleId === 'powerClean').status).toBe(BALANCE_STATUSES.NO_DATA)
  })

  it('names the exercise a role is set to even when it has no data, so the view can show it', () => {
    const template = TEMPLATES.poliquin
    const deadlift = findRole(template, 'deadlift')
    const S = { unit: 'kg', workouts: [], balanceOverrides: { [overrideKey(template, deadlift)]: '0085' } }
    const results = computeBalance(S, template)

    const unlogged = results.find(r => r.roleId === 'powerClean')
    expect(unlogged.mappedExerciseId).toBe(null)
    expect(unlogged.configuredExerciseId).toBe('0648') // the whitelist's first choice

    const overridden = results.find(r => r.roleId === 'deadlift')
    expect(overridden.configuredExerciseId).toBe('0085') // the exercise the user picked
    expect(overridden.isOverridden).toBe(true)
  })
})

describe('targetFor', () => {
  it('falls back to the male/default figure when S.body is not female or no female figure exists', () => {
    const role = findRole(TEMPLATES.atg, 'romanianDeadlift')
    expect(targetFor(role, { body: 'male' })).toBe(100)
    expect(targetFor(role, {})).toBe(100)
    expect(targetFor(role, { body: 'female' })).toBe(80)
  })

  it('load-ratio roles have no female figure and are unaffected by S.body', () => {
    const role = findRole(TEMPLATES.thibaudeauPowerlifting, 'bench')
    expect(targetFor(role, { body: 'female' })).toBe(75)
  })
})

describe('ratioFor', () => {
  it('returns null for a load-ratio role when the anchor has no reading', () => {
    const role = findRole(TEMPLATES.thibaudeauPowerlifting, 'bench')
    expect(ratioFor(role, { estKg: 80 }, { anchorCurrent: null })).toBe(null)
  })

  it('returns null for a bodyweight-ratio role when bodyweight is unknown', () => {
    const role = findRole(TEMPLATES.atg, 'romanianDeadlift')
    expect(ratioFor(role, { estKg: 80 }, { bodyweightKg: null })).toBe(null)
  })
})
