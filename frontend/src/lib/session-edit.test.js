import { describe, expect, it } from 'vitest'
import { editCompletedSession, saveWorkoutEdit } from './session-edit.js'
import { mergeStates } from './sync-merge.js'

const entry = (w, id = '0025') => ({ id, sets: [{ w, r: 5, done: true }], target: { mode: 'reps' } })
const fixture = () => ({
  active: null,
  exWeights: {},
  routines: [{ id: 'routine', ex: [] }],
  workouts: [{ id: 'workout', d: '2026-09-01', start: 1000, end: 2000, entries: [entry(40)], note: 'old', prs: ['0025'] }],
})

describe('saved workout editing', () => {
  it('keeps history unchanged until Save, survives reload and preserves its identity, clock and templates', () => {
    const state = fixture(), history = structuredClone(state.workouts), routines = structuredClone(state.routines)
    editCompletedSession(state, 'workout')
    state.active.entries[0].sets[0].w = 80
    state.active.note = ''
    expect(state.workouts).toEqual(history)
    const reloaded = JSON.parse(JSON.stringify(state))
    const saved = saveWorkoutEdit(reloaded)
    expect(saved).toMatchObject({ id: 'workout', d: '2026-09-01', start: 1000, end: 2000, vol: 400 })
    expect(saved).not.toHaveProperty('note')
    expect(saved).not.toHaveProperty('editingWorkoutId')
    expect(reloaded.active).toBeNull()
    expect(reloaded.routines).toEqual(routines)
  })

  it('saves added exercises and sets without persisting a live prescription', () => {
    const state = fixture()
    editCompletedSession(state, 'workout')
    state.active.entries[0].sets.push({ w: 42.5, r: 4, done: true })
    state.active.entries.push({ ...entry(25, 'added'), rid: 'routine', plan: { kind: 'up' } })
    const saved = saveWorkoutEdit(state)
    expect(saved.entries[0].sets).toHaveLength(2)
    expect(saved.entries[1]).toMatchObject({ id: 'added', rid: 'routine' })
    expect(saved.entries[1]).not.toHaveProperty('plan')
  })

  it('rebuilds best weights and PR flags after lowering record work', () => {
    const state = fixture()
    state.workouts.push({ id: 'later', d: '2026-09-02', start: 3000, end: 4000, entries: [entry(30)], prs: [] })
    state.exWeights['0025'] = { w: 40, d: '2026-09-01' }
    editCompletedSession(state, 'workout')
    state.active.entries[0].sets[0].w = 20
    saveWorkoutEdit(state)
    // The kept 40 came from this very session, and the edit took it away.
    expect(state.exWeights['0025']).toEqual({ w: 30, d: '2026-09-02' })
    // Still the first 20 ever. The later 30 never had a badge, and a session that was not
    // edited is never handed one (the rule a date move follows too, lib/workout-date.js).
    expect(state.workouts[0].prs).toEqual(['0025'])
    expect(state.workouts[1].prs).toEqual([])
  })

  it('takes a badge from a later session the edit raised the bar above, and leaves a kept load from elsewhere', () => {
    const state = fixture()
    state.workouts[0].prs = []
    state.workouts.push({ id: 'later', d: '2026-09-02', start: 3000, end: 4000, entries: [entry(50)], prs: ['0025'] })
    state.exWeights['0025'] = { w: 55, d: '2026-09-03' }   // confirmed in the top-weight sheet
    editCompletedSession(state, 'workout')
    state.active.entries[0].sets[0].w = 60
    saveWorkoutEdit(state)
    expect(state.workouts.map(w => w.prs)).toEqual([['0025'], []])
    expect(state.exWeights['0025']).toEqual({ w: 55, d: '2026-09-03' })
  })

  it('keeps assisted-machine records ordered by less help after an edit', () => {
    const state = fixture()
    state.workouts[0].entries = [entry(30, '0017')]
    state.workouts[0].prs = ['0017']
    state.workouts.push({ id: 'later', d: '2026-09-02', start: 3000, end: 4000, entries: [entry(25, '0017')], prs: ['0017'] })
    state.exWeights['0017'] = { w: 25, d: '2026-09-02' }
    editCompletedSession(state, 'workout')
    state.active.entries[0].sets[0].w = 20
    saveWorkoutEdit(state)
    // 20 kg of help is less than the later 25: the edited session leads and the later one no
    // longer does. Less help is a better kept load, so there is nothing to lower.
    expect(state.workouts.map(w => w.prs)).toEqual([['0017'], []])
    expect(state.exWeights['0017']).toEqual({ w: 25, d: '2026-09-02' })
  })

  it('preserves repeated occurrences, combined-routine ownership and per-side fields', () => {
    const state = fixture(), workout = state.workouts[0]
    workout.routineIds = ['a', 'b']
    workout.entries = [
      { ...entry(40), rid: 'a', occurrenceId: 'first', opaque: { retained: true } },
      { ...entry(20), rid: 'b', occurrenceId: 'second', sets: [{ w: 20, r: 8, done: true, sides: { L: { w: 12, r: 4, done: true }, R: { w: 8, r: 4, done: true } } }] },
    ]
    editCompletedSession(state, 'workout')
    state.active.entries[1].sets[0].sides.L.w = 14
    const saved = saveWorkoutEdit(state)
    expect(saved.entries.map(item => [item.occurrenceId, item.rid])).toEqual([['first', 'a'], ['second', 'b']])
    expect(saved.entries[0].opaque).toEqual({ retained: true })
    expect(saved.entries[1].sets[0].sides.L.w).toBe(14)
  })

  it('keeps a partially completed per-side occurrence and its opaque ownership', () => {
    const state = fixture()
    state.workouts[0].entries = [{
      ...entry(20), rid: 'routine', occurrenceId: 'partial',
      sets: [{ w: 20, r: 8, done: false, sides: {
        L: { w: 20, r: 4, done: true }, R: { w: 17.5, r: 4, done: false },
      } }],
    }]
    editCompletedSession(state, 'workout')
    const saved = saveWorkoutEdit(state)
    expect(saved.entries[0]).toMatchObject({ rid: 'routine', occurrenceId: 'partial' })
    expect(saved.entries[0].sets[0].sides).toEqual({
      L: { w: 20, r: 4, done: true }, R: { w: 17.5, r: 4, done: false },
    })
    expect(saved.vol).toBe(80)
  })

  it('keeps the draft when the workout was deleted meanwhile', () => {
    const deleted = fixture()
    editCompletedSession(deleted, 'workout')
    deleted.active.entries[0].sets[0].w = 50
    deleted.workouts = []
    expect(() => saveWorkoutEdit(deleted)).toThrow('deleted on another device')
    expect(deleted.active.editingWorkoutId).toBe('workout')
    expect(deleted.active.entries[0].sets[0].w).toBe(50)
    expect(deleted.workouts).toEqual([])
  })

  // Another device moved the workout or corrected its note while this one edited its sets. What
  // the editor does not edit stays as the other device left it; the sets are the editor's.
  it('saves over the record as history holds it now, keeping what the editor does not edit', () => {
    const state = fixture()
    editCompletedSession(state, 'workout')
    state.active.entries[0].sets[0].w = 50
    Object.assign(state.workouts[0], { d: '2026-08-20', start: 500, end: 1500, note: 'from phone' })
    state.active.note = 'from phone'
    const saved = saveWorkoutEdit(state)
    expect(saved).toMatchObject({ id: 'workout', d: '2026-08-20', start: 500, end: 1500, note: 'from phone' })
    expect(saved.entries[0].sets[0].w).toBe(50)
  })

  it('stamps the edit, and the edit replaces the old copy by id in a merge whichever copy is newer', () => {
    const state = fixture()
    editCompletedSession(state, 'workout')
    state.active.entries[0].sets[0].w = 50
    const saved = saveWorkoutEdit(state, 1234)
    expect(saved._ts).toBe(1234)
    const phone = { ...fixture(), _ts: 9999 }
    for (const merged of [mergeStates({ ...state, _ts: 1234 }, phone), mergeStates(phone, { ...state, _ts: 1234 })]) {
      expect(merged.workouts).toHaveLength(1)
      expect(merged.workouts[0].entries[0].sets[0].w).toBe(50)
    }
  })

  it('opens and saves a workout logged before ids, freezing its old key as its id', () => {
    const state = fixture()
    delete state.workouts[0].id
    state.workouts.push({ d: '2026-09-02', start: 3000, end: 4000, entries: [entry(30)], prs: [] })
    editCompletedSession(state, state.workouts[1])
    expect(state.active.editingWorkoutId).toBe('2026-09-02|3000')
    state.active.entries[0].sets[0].w = 35
    const saved = saveWorkoutEdit(state)
    expect(saved).toMatchObject({ id: '2026-09-02|3000', d: '2026-09-02', start: 3000 })
    expect(state.workouts[0]).not.toHaveProperty('id')
    expect(state.workouts[0].entries[0].sets[0].w).toBe(40)
    const other = { ...fixture(), _ts: 9999, workouts: [state.workouts[0], { d: '2026-09-02', start: 3000, end: 4000, entries: [entry(30)], prs: [] }] }
    expect(mergeStates(other, { ...state, _ts: 1 }).workouts.map(w => w.entries[0].sets[0].w)).toEqual([40, 35])
  })

  it('keeps only the loads, not the marks the live session used, and no prescription explanation', () => {
    const state = fixture()
    editCompletedSession(state, 'workout')
    state.active.entries[0].sets[0] = { w: 45, r: 5, done: true, weightOrigin: 'manual' }
    state.active.entries[0].plan = { kind: 'hold' }
    state.active.entries[0].carried = true
    const saved = saveWorkoutEdit(state)
    expect(JSON.stringify(saved)).not.toMatch(/weightOrigin|"plan"|carried|editingWorkoutId/)
  })
})
