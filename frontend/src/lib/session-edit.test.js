import { describe, expect, it } from 'vitest'
import { editCompletedSession, saveWorkoutEdit } from './session-edit.js'
import { mergeStates } from './sync-merge.js'
import { entryExcluded, lastEntryFor } from './history.js'

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
    const saved = saveWorkoutEdit(state)
    expect(saved).toMatchObject({ id: 'workout', d: '2026-08-20', start: 500, end: 1500, note: 'from phone' })
    expect(saved.entries[0].sets[0].w).toBe(50)
    expect(saved).not.toHaveProperty('editBase')
  })

  // The note typed in WorkoutDetail after a reload that did not land on the editor, or one a sync
  // brought in: a Save that only changed a weight neither writes the opened note back nor deletes
  // the new one. A note or name the editor changed itself is still the editor's.
  it('keeps a note written or renamed elsewhere while the editor was open, unless the editor changed it', () => {
    const added = fixture()
    delete added.workouts[0].note
    editCompletedSession(added, 'workout')
    added.active.entries[0].sets[0].w = 50
    added.workouts[0].note = 'knee felt off'
    added.workouts[0].name = 'Legs'
    expect(saveWorkoutEdit(added)).toMatchObject({ note: 'knee felt off', name: 'Legs' })

    const changed = fixture()
    editCompletedSession(changed, 'workout')
    changed.active.entries[0].sets[0].w = 50
    changed.workouts[0].note = 'knee felt off'
    expect(saveWorkoutEdit(changed).note).toBe('knee felt off')

    const cleared = fixture()
    editCompletedSession(cleared, 'workout')
    cleared.workouts[0].note = 'knee felt off'
    delete cleared.active.note
    cleared.active.name = 'Heavy day'
    const saved = saveWorkoutEdit(cleared)
    expect(saved).not.toHaveProperty('note')
    expect(saved.name).toBe('Heavy day')

    const removedElsewhere = fixture()
    editCompletedSession(removedElsewhere, 'workout')
    removedElsewhere.active.entries[0].sets[0].w = 50
    delete removedElsewhere.workouts[0].note
    expect(saveWorkoutEdit(removedElsewhere)).not.toHaveProperty('note')
  })

  // A workout logged before exclusion moved onto the entries (ENG-11) carries only the whole-
  // workout flag. Editing it must not turn it into a regular session that the next one of the
  // exercise reads as its last time.
  it('keeps a workout saved with the old exclude-from-progression flag out of progression after an edit', () => {
    const state = fixture()
    state.workouts[0] = { ...state.workouts[0], routineId: 'main', routineIds: ['main'], entries: [entry(80)] }
    state.workouts.push({ id: 'rehab', d: '2026-09-02', start: 3000, end: 4000, routineId: 'rehab', routineIds: ['rehab'], excludeFromProgression: true, entries: [entry(10)], prs: [] })
    expect(lastEntryFor(state, '0025').sets[0].w).toBe(80)
    editCompletedSession(state, 'rehab')
    state.active.entries[0].sets[0].r = 6
    const saved = saveWorkoutEdit(state)
    expect(saved.entries.every(e => entryExcluded(saved, e) && e.noProg === true)).toBe(true)
    expect(saved.excludeFromProgression).toBe(true)
    expect(saved.entries[0].sets[0].r).toBe(6)
    expect(lastEntryFor(state, '0025').sets[0].w).toBe(80)
  })

  // The header ⋮'s "Don't count for progression" for the whole workout (lib/session-noprog.js)
  // opens on for a workout saved out as a whole, and off for one that counts.
  it('opens a workout kept out as a whole with the whole-workout switch on, and a counting one with it off', () => {
    const state = fixture()
    state.workouts.push({ id: 'rehab', d: '2026-09-02', start: 3000, end: 4000, excludeFromProgression: true, entries: [{ ...entry(10), noProg: true }], prs: [] })
    editCompletedSession(state, 'rehab')
    expect(state.active.noProg).toBe(true)
    const saved = saveWorkoutEdit(state)
    expect(saved).not.toHaveProperty('noProg')

    editCompletedSession(state, 'workout')
    expect(state.active).not.toHaveProperty('noProg')
  })

  // A stamp outranks what another device wrote since. Opening the editor and saving without a
  // change must not give the record one, or it beats sets added on the phone that have not synced.
  it('leaves the record and its stamp alone when Save changed nothing', () => {
    const state = fixture()
    state.workouts[0] = { ...state.workouts[0], name: 'Legs', routineIds: [], routineId: null, entries: [{ ...entry(40), topW: 40 }], vol: 200, _ts: 7 }
    const before = structuredClone(state.workouts)
    editCompletedSession(state, 'workout')
    expect(saveWorkoutEdit(state, 1234)).toEqual(before[0])
    expect(state.workouts).toEqual(before)
    expect(state.active).toBeNull()

    editCompletedSession(state, 'workout')
    state.active.entries[0].sets[0].r = 6
    expect(saveWorkoutEdit(state, 1234)._ts).toBe(1234)
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
