// Replace an exercise in a routine (#110): the slot keeps what was set up for it, only the
// exercise changes — and the new exercise does not inherit the old one's progress.
import { describe, it, expect } from 'vitest'
import { replaceSlotExercise } from './routines.js'
import { buildCombinedEntries } from './session-merge.js'
import { buildCompletedWorkout } from './finish-workout.js'
import { lastEntryFor } from './history.js'
import { isWarmupRow } from './workout-model.js'

const BENCH = '0025'      // barbell bench press
const DB_BENCH = '0289'   // dumbbell bench press
const PUSH_UP = '0662'    // push-up, body weight
const PULL_UP = '0652'    // pull-up, body weight
const BIKE = '2138'       // stationary bike, cardio

describe('replaceSlotExercise', () => {
  it('keeps the slot\'s sets, reps, weight, rule, rest, warm-ups, note and superset', () => {
    const slot = {
      id: BENCH, sg: 'sgA', sets: 4, mode: 'reps', reps: 8, repsMin: 6, weight: 60, prog: 'double', inc: 1.25,
      deloadFactor: 0.85, note: 'pause on the chest', warmupSets: 2, restSec: 150, side: true,
      intensifier: { type: 'dropset', count: 1, pct: 20 },
    }
    const next = replaceSlotExercise(slot, DB_BENCH)
    expect(next).toEqual({ ...slot, id: DB_BENCH })
    // A new object — the routine's own slot is not edited behind the store's back.
    expect(slot.id).toBe(BENCH)
  })

  it('keeps a timed slot timed', () => {
    const next = replaceSlotExercise({ id: BENCH, sets: 3, mode: 'time', sec: 40, weight: 20 }, DB_BENCH)
    expect(next).toEqual({ id: DB_BENCH, sets: 3, mode: 'time', sec: 40, weight: 20 })
  })

  it('drops a load that means something else once the exercise is bodyweight, or stops being', () => {
    // 60 kg on a bar is not 60 kg added to a push-up …
    expect(replaceSlotExercise({ id: BENCH, sets: 3, mode: 'reps', reps: 10, weight: 60 }, PUSH_UP))
      .toEqual({ id: PUSH_UP, sets: 3, mode: 'reps', reps: 10, weight: 0 })
    // … and a push-up's rep ceiling and belt are not a bench press's numbers.
    expect(replaceSlotExercise({ id: PUSH_UP, sets: 3, mode: 'reps', reps: 12, weight: 10, repsMax: 20, bodyweight: true }, BENCH))
      .toEqual({ id: BENCH, sets: 3, mode: 'reps', reps: 12, weight: 0 })
  })

  it('keeps an added weight from one bodyweight exercise to another, and lets the new one follow its own equipment', () => {
    expect(replaceSlotExercise({ id: PUSH_UP, sets: 3, mode: 'reps', reps: 8, weight: 10, repsMax: 15, bodyweight: true }, PULL_UP))
      .toEqual({ id: PULL_UP, sets: 3, mode: 'reps', reps: 8, weight: 10, repsMax: 15 })
    // A push-up the user had turned into a loaded exercise: that choice was about the push-up.
    expect(replaceSlotExercise({ id: PUSH_UP, sets: 3, mode: 'reps', reps: 8, weight: 20, bodyweight: false }, PULL_UP))
      .toEqual({ id: PULL_UP, sets: 3, mode: 'reps', reps: 8, weight: 0 })
  })

  it('starts from the new exercise\'s defaults between cardio and lifting, keeping the note, rest and superset', () => {
    expect(replaceSlotExercise({ id: BENCH, sg: 'sgA', sets: 4, mode: 'reps', reps: 8, weight: 60, note: 'n', restSec: 90 }, BIKE))
      .toEqual({ id: BIKE, sets: 1, min: 20, speed: 8, sg: 'sgA', note: 'n', restSec: 90 })
    expect(replaceSlotExercise({ id: BIKE, sets: 2, min: 30, speed: 12, note: 'easy' }, BENCH))
      .toEqual({ id: BENCH, sets: 3, reps: 10, weight: 0, mode: 'reps', note: 'easy' })
  })

  it('keeps a cardio slot\'s minutes and speed on another cardio exercise', () => {
    expect(replaceSlotExercise({ id: BIKE, sets: 2, min: 30, speed: 12 }, '3666'))
      .toEqual({ id: '3666', sets: 2, min: 30, speed: 12 })
  })
})

// Per-slot history is the routine and the exercise together (#216), so a replaced slot is a new
// line of progress: the new exercise opens at the slot's numbers, and the old exercise's
// sessions stay its own. These start and finish sessions the way the app does.
describe('history after a replace', () => {
  const work = e => e.sets.filter(s => !isWarmupRow(s))
  let day = 1
  function train(st, rid) {
    const entries = buildCombinedEntries(st, [rid]).entries
      .map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, done: true })) }))
    const active = { id: 'w' + day, d: `2026-08-${String(day).padStart(2, '0')}`, start: day * 1000, routineIds: [rid], name: 'x', entries }
    day++
    st.workouts.push(buildCompletedWorkout(active, { end: active.start + 1 }))
  }
  const state = () => ({
    unit: 'kg', exWeights: {}, workouts: [], week: {}, dayPlan: {},
    routines: [{ id: 'A', name: 'Push', ex: [{ id: BENCH, sets: 2, mode: 'reps', reps: 10, weight: 60 }] }],
  })

  it('starts the new exercise fresh at the slot\'s numbers, and leaves the old one\'s progress where it was', () => {
    const st = state()
    train(st, 'A')
    train(st, 'A')
    // The bench has moved on from the plan's 60 in this routine.
    const [bench] = buildCombinedEntries(st, ['A']).entries
    expect(work(bench).map(s => s.w)).toEqual([65, 65])

    st.routines[0].ex[0] = replaceSlotExercise(st.routines[0].ex[0], DB_BENCH)
    const [db] = buildCombinedEntries(st, ['A']).entries
    expect(db.id).toBe(DB_BENCH)
    // Not the bench's 65: the dumbbells have never been logged, so they open at the slot's own
    // sets × reps × weight, and say why.
    expect(work(db).map(s => [s.w, s.r])).toEqual([[60, 10], [60, 10]])
    expect(db.plan.why[0]).toBe('Nothing logged yet — this session sets the baseline.')
    expect(lastEntryFor(st, DB_BENCH, 'A')).toBeNull()

    // The bench's sessions in this routine are still there if it comes back.
    expect(lastEntryFor(st, BENCH, 'A')?.sets.map(s => s.w)).toEqual([62.5, 62.5])
    st.routines[0].ex[0] = replaceSlotExercise(st.routines[0].ex[0], BENCH)
    const [back] = buildCombinedEntries(st, ['A']).entries
    expect(work(back).map(s => s.w)).toEqual([65, 65])
  })
})
