import { describe, it, expect } from 'vitest'
import { scheduleModeOf, queueRecovery, rotationIds, startPass, saveRotation, startNewPass, stopPass, refillAfter } from './rotation.js'
import { queueRemaining, queueView } from './queue.js'

const routines = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'own', name: 'Core' }]
const TODAY = '2026-09-12'
const NOW = Date.parse(TODAY + 'T10:00:00')

// today/now are passed straight into the functions under test (see rotation.js), so none of
// this needs the system clock or fake timers at all.
const S = (over = {}) => ({ routines, workouts: [], week: {}, dayPlan: {}, queue: null, rotation: null, ...over })
// A finished workout on routine `id`, dated `d`. `start` defaults comfortably before NOW — not
// equal to it — so a fixture accidentally sitting exactly on a new pass's `since` never masks a
// real off-by-one in the boundary it's meant to test.
const w = (id, d, start = NOW - 1000) => ({ id: 'w-' + id + d, d, start, routineIds: [id], routineId: id, name: routines.find(r => r.id === id).name, entries: [] })
const pass = (ids, over = {}) => ({ ids, since: NOW - 86400000, startsOn: '2026-09-10', label: 'Rotation', ...over })

describe('the selected mode is derived from the live queue', () => {
  it('no usable queue is Fixed Week; a usable one is Rotation', () => {
    expect(scheduleModeOf(S())).toBe('week')
    expect(scheduleModeOf(S({ queue: pass(['a', 'b']) }))).toBe('rotation')
    // a saved rotation alone schedules nothing
    expect(scheduleModeOf(S({ rotation: { id: 'r1', sequence: ['a', 'b'], label: 'Rotation' } }))).toBe('week')
  })

  it('a malformed queue is Week plus recovery, never Rotation', () => {
    const st = S({ queue: { ids: ['gone'], since: NOW } })
    expect(scheduleModeOf(st)).toBe('week')
    expect(queueRecovery(st)).toBe(true)
    expect(queueRecovery(S())).toBe(false)
    expect(queueRecovery(S({ queue: pass(['a']) }))).toBe(false)
  })
})

describe('starting a pass from a saved rotation', () => {
  it('starts today, from the rotation ids that still exist, stamped with the rotation id', () => {
    const s = S({ rotation: { id: 'r1', sequence: ['a', 'gone', 'b', 'a'], label: 'My split' } })
    expect(startPass(s, TODAY, NOW)).toBe(true)
    expect(s.queue).toEqual({ ids: ['a', 'b'], since: NOW, startsOn: TODAY, label: 'My split', rotationId: 'r1' })
  })

  it('does nothing when no rotation routine survives', () => {
    const s = S({ rotation: { id: 'r1', sequence: ['gone'], label: 'x' } })
    expect(startPass(s, TODAY, NOW)).toBe(false)
    expect(s.queue).toBe(null)
  })
})

describe('editing the sequence', () => {
  it('the first save creates the rotation and its pass', () => {
    const s = S()
    saveRotation(s, ['a', 'b', 'c'], 'My split', TODAY, NOW)
    expect(s.rotation.sequence).toEqual(['a', 'b', 'c'])
    expect(s.queue).toEqual({ ids: ['a', 'b', 'c'], since: NOW, startsOn: TODAY, label: 'My split', rotationId: s.rotation.id })
  })

  it('an ordinary edit keeps the pass, so logged progress survives', () => {
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b', 'c'], label: 'My split' },
      queue: pass(['a', 'b', 'c'], { rotationId: 'r1' }),
      workouts: [w('a', '2026-09-11')],
    })
    saveRotation(s, ['c', 'b', 'a', 'own'], 'My split', TODAY, NOW)
    expect(s.queue.since).toBe(NOW - 86400000)
    expect(s.queue.startsOn).toBe('2026-09-10')
    expect(queueRemaining(s)).toEqual(['c', 'b', 'own'])   // 'a' is still done
    expect(s.rotation.id).toBe('r1')
  })

  it('saving an externally written queue adopts it: same pass, now carrying the rotation id', () => {
    const s = S({ queue: pass(['a', 'b'], { label: 'US W1' }) })   // no rotationId
    saveRotation(s, ['a', 'b'], 'US W1', TODAY, NOW)
    expect(s.queue.since).toBe(NOW - 86400000)
    expect(s.queue.startsOn).toBe('2026-09-10')
    expect(s.queue.rotationId).toBe(s.rotation.id)
  })

  it('an edit that completes the pass on the spot starts the next one immediately', () => {
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' },
      queue: pass(['a', 'b'], { rotationId: 'r1' }),
      workouts: [w('a', '2026-09-11')],   // 'a' already done; removing 'b' would finish the pass
    })
    saveRotation(s, ['a'], 'My split', TODAY, NOW)
    expect(s.rotation.sequence).toEqual(['a'])
    // completing on save immediately starts the next pass — today, since the credit that closed
    // the old one was logged yesterday, not today (the one-day boundary only pushes to tomorrow
    // when today's own workout is what completed the pass).
    expect(s.queue.startsOn).toBe(TODAY)
    expect(queueRemaining(s)).toEqual(['a'])
  })

  it('removing a session clears its future pin, but leaves past pins and pins on kept sessions alone', () => {
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b', 'c'], label: 'My split' },
      queue: pass(['a', 'b', 'c'], { rotationId: 'r1' }),
      dayPlan: { '2026-09-11': 'b', '2026-09-12': 'c', '2026-09-14': 'a' },
    })
    saveRotation(s, ['a', 'b'], 'My split', TODAY, NOW)   // drops 'c'
    expect(s.dayPlan).toEqual({ '2026-09-11': 'b', '2026-09-14': 'a' })
  })

  it('Start new pass rewinds to today, and to tomorrow when today closed the old one', () => {
    const base = { rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' } }
    const stale = S({ ...base, queue: pass(['a', 'b'], { rotationId: 'r1' }), workouts: [w('a', '2026-09-10'), w('b', '2026-09-10')] })
    startNewPass(stale, TODAY, NOW)
    expect(stale.queue.startsOn).toBe(TODAY)
    // …but a pass closed by a workout dated today must not have that same workout credit the new one
    const fresh = S({ ...base, queue: pass(['a', 'b'], { rotationId: 'r1' }), workouts: [w('a', '2026-09-10'), w('b', TODAY)] })
    startNewPass(fresh, TODAY, NOW)
    expect(fresh.queue.startsOn).toBe('2026-09-13')
    expect(fresh.queue.since).toBe(NOW)
  })

  it('Start new pass sweeps the old pass\'s future pins — a stale one would otherwise resurface as open on the new pass', () => {
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' },
      queue: pass(['a', 'b'], { rotationId: 'r1' }),
      dayPlan: { '2026-09-13': 'b', '2026-09-11': 'a' },
    })
    startNewPass(s, TODAY, NOW)
    expect(s.dayPlan).toEqual({ '2026-09-11': 'a' })   // dated before today: left alone, already stale on its own
  })
})

describe('stopPass', () => {
  it('clears the queue and sweeps its future pins, leaving the saved sequence untouched', () => {
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' },
      queue: pass(['a', 'b'], { rotationId: 'r1' }),
      dayPlan: { '2026-09-13': 'a', '2026-09-10': 'b' },
    })
    stopPass(s, TODAY)
    expect(s.queue).toBe(null)
    expect(s.rotation).toEqual({ id: 'r1', sequence: ['a', 'b'], label: 'My split' })
    expect(s.dayPlan).toEqual({ '2026-09-10': 'b' })   // dated before today: not this pass's business
  })

  it('does nothing to dayPlan when there is no queue to stop', () => {
    const s = S({ dayPlan: { '2026-09-13': 'a' } })
    stopPass(s, TODAY)
    expect(s.queue).toBe(null)
    expect(s.dayPlan).toEqual({ '2026-09-13': 'a' })
  })
})

describe('refilling a completed managed pass', () => {
  const managed = (ids, workouts) => S({
    rotation: { id: 'r1', sequence: ['a', 'b', 'c'], label: 'My split' },
    queue: pass(ids, { rotationId: 'r1' }),
    workouts,
  })

  it('completed in order refills in the same order, starting tomorrow', () => {
    const last = w('c', TODAY)
    const s = managed(['a', 'b', 'c'], [w('a', '2026-09-10'), w('b', '2026-09-11'), last])
    expect(refillAfter(s, last, TODAY, NOW)).toBe(true)
    expect(s.queue).toEqual({ ids: ['a', 'b', 'c'], since: NOW, startsOn: '2026-09-13', label: 'My split', rotationId: 'r1' })
  })

  it('the routine that closed the pass is the one the next pass ends with', () => {
    const last = w('b', TODAY)
    const s = managed(['a', 'b', 'c'], [w('c', '2026-09-10'), w('a', '2026-09-11'), last])
    expect(refillAfter(s, last, TODAY, NOW)).toBe(true)
    expect(s.queue.ids).toEqual(['c', 'a', 'b'])
  })

  it('a merged session credits every matching item; the last one in slot order sets the next pass', () => {
    const merged = { id: 'm', d: TODAY, start: NOW - 1000, routineIds: ['a', 'b'], routineId: 'a', name: 'A + B', entries: [] }
    const s = managed(['c', 'a', 'b'], [w('c', '2026-09-10'), merged])
    expect(refillAfter(s, merged, TODAY, NOW)).toBe(true)
    expect(s.queue.ids).toEqual(['c', 'a', 'b'])   // 'b' closed it, so the next pass ends on 'b'
  })

  it('an incomplete pass is left alone', () => {
    const last = w('a', TODAY)
    const s = managed(['a', 'b', 'c'], [last])
    expect(refillAfter(s, last, TODAY, NOW)).toBe(false)
    expect(s.queue.since).toBe(NOW - 86400000)
  })

  it('a queue without a matching rotationId is never rewritten', () => {
    const last = w('b', TODAY)
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' },
      queue: pass(['a', 'b'], { label: 'US W1' }),          // an external planner's pass
      workouts: [w('a', '2026-09-11'), last],
    })
    expect(refillAfter(s, last, TODAY, NOW)).toBe(false)
    expect(s.queue.rotationId).toBe(undefined)
    expect(s.queue.since).toBe(NOW - 86400000)
  })

  it('a queue and a rotation both missing their ids never match by accident', () => {
    // Hardening for the boundary case `!q?.rotationId || !s.rotation?.id`: two undefineds must
    // never read as equal and let an unrelated pass rewrite over someone else's queue.
    const last = w('b', TODAY)
    const s = S({
      rotation: { sequence: ['a', 'b'], label: 'My split' },   // no id
      queue: pass(['a', 'b']),                                 // no rotationId
      workouts: [w('a', '2026-09-11'), last],
    })
    expect(refillAfter(s, last, TODAY, NOW)).toBe(false)
  })

  it('a managed pass that no longer matches its rotation waits for the editor', () => {
    const last = w('b', TODAY)
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b', 'c'], label: 'My split' },
      queue: pass(['a', 'b'], { rotationId: 'r1' }),        // not a circular ordering of a,b,c
      workouts: [w('a', '2026-09-11'), last],
    })
    expect(refillAfter(s, last, TODAY, NOW)).toBe(false)
  })

  it('there is no queue to refill without one', () => {
    expect(refillAfter(S(), w('a', TODAY), TODAY, NOW)).toBe(false)
  })

  it('a backfilled finish dated before other logged workouts still starts the new pass after the latest of them', () => {
    const backfilled = w('c', '2026-09-08')
    const s = managed(['a', 'b', 'c'], [w('a', '2026-09-10'), w('b', '2026-09-11'), backfilled])
    expect(refillAfter(s, backfilled, TODAY, NOW)).toBe(true)
    expect(s.queue.startsOn).toBe('2026-09-12')
  })

  it("sweeps every future pin the closing pass left behind, so a fulfilled one does not reopen on the next pass", () => {
    const last = w('c', TODAY)
    const s = managed(['a', 'b', 'c'], [w('a', '2026-09-10'), w('b', '2026-09-11'), last])
    s.dayPlan = { '2026-09-13': 'a', '2026-09-14': 'c', '2026-09-09': 'b' }
    expect(refillAfter(s, last, TODAY, NOW)).toBe(true)
    expect(s.dayPlan).toEqual({ '2026-09-09': 'b' })   // dated before today: already stale on its own
  })

  it("uses the rotation's own label, never the closing pass's — an adopted pass's planner name must not repeat on every pass after it", () => {
    const last = w('c', TODAY)
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b', 'c'], label: 'Rotation' },
      queue: pass(['a', 'b', 'c'], { rotationId: 'r1', label: 'US W1' }),   // this pass still carries the planner's name
      workouts: [w('a', '2026-09-10'), w('b', '2026-09-11'), last],
    })
    expect(refillAfter(s, last, TODAY, NOW)).toBe(true)
    expect(s.queue.label).toBe('Rotation')
  })

  it('a workout logged with a clock ahead of now does not re-credit the new pass', () => {
    // The bug: `since = Date.now()` at refill time sits before a workout whose own clock (a
    // backfilled entry, or a device a few minutes fast) already reads later — that workout then
    // reads as done in the pass that has not even started yet.
    const last = w('c', TODAY, NOW - 1000)
    const skewed = w('a', '2026-09-11', NOW + 5 * 60000)   // "logged" five minutes ahead of now
    const s = managed(['a', 'b', 'c'], [skewed, w('b', '2026-09-11'), last])
    expect(refillAfter(s, last, TODAY, NOW)).toBe(true)
    expect(queueRemaining(s)).toEqual(['a', 'b', 'c'])
    expect(queueView(s, TODAY).waiting).toBe(true)
  })
})

describe('the finished-workout boundary', () => {
  it('refills from the workout the finish screen actually writes', async () => {
    const { buildCompletedWorkout } = await import('./finish-workout.js')
    const active = {
      id: 'w1', d: TODAY, start: NOW, routineIds: ['b'], name: 'B',
      entries: [{ id: '0025', sets: [{ w: 60, reps: 5, done: true }] }],
    }
    const done = buildCompletedWorkout(active)
    const s = S({
      rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' },
      queue: pass(['a', 'b'], { rotationId: 'r1' }),
      workouts: [w('a', '2026-09-11')],
      // a pin on an adopted coach queue, dated after today — must not bleed into the next pass
      dayPlan: { '2026-09-13': 'a' },
    })
    s.workouts.push(done)                       // what doFinishWorkout does, in order
    expect(refillAfter(s, done, TODAY, NOW)).toBe(true)
    expect(s.queue.ids).toEqual(['a', 'b'])
    expect(s.queue.startsOn).toBe('2026-09-13')
    // Nothing is due until tomorrow — not because both sessions happen to read as already done
    // (the masked bug: `since` landing exactly on a same-day workout's own `start`), but because
    // the pass has not started yet.
    expect(queueRemaining(s)).toEqual(['a', 'b'])
    expect(queueView(s, TODAY).waiting).toBe(true)
    expect(s.dayPlan).toEqual({})
  })
})
