import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'

const mocks = vi.hoisted(() => {
  const state = {
    S: null,
    timer: null,
    work: null,
    startRest: vi.fn(),
    stopRest: null,
    stopWork: null,
    confirmSheet: vi.fn(),
    topWeightSheet: vi.fn(),
    workoutCompleteSheet: vi.fn(),
    exercisePicker: vi.fn(),
    exConfigSheet: vi.fn(),
    toast: vi.fn(),
    scrollCalls: [],
    swapActiveWorkoutExercise: vi.fn(),
  }
  state.stopRest = vi.fn(() => { state.timer = null })
  state.stopWork = vi.fn(() => { state.work = null })
  state.storeSnapshot = () => ({
    S: state.S,
    user: null,
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
  })
  state.uiSnapshot = () => ({
    timer: state.timer,
    work: state.work,
    startRest: state.startRest,
    stopRest: state.stopRest,
    stopWork: state.stopWork,
    shiftRestOwner: vi.fn(),
    startWork: vi.fn(),
    toast: state.toast,
  })
  return state
})

vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector(mocks.storeSnapshot())
  useStore.getState = mocks.storeSnapshot
  return { useStore }
})
vi.mock('../store/useUI.js', () => {
  const useUI = selector => selector ? selector(mocks.uiSnapshot()) : mocks.uiSnapshot()
  useUI.getState = mocks.uiSnapshot
  return { useUI }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  startFlow: vi.fn(),
  exercisePicker: mocks.exercisePicker,
  exConfigSheet: mocks.exConfigSheet,
  exerciseDetailSheet: vi.fn(),
  topWeightSheet: mocks.topWeightSheet,
  finishWorkout: vi.fn(),
  workoutCompleteSheet: mocks.workoutCompleteSheet,
  confirmSheet: mocks.confirmSheet,
  swapActiveWorkoutExercise: mocks.swapActiveWorkoutExercise,
  // Both note sheets belong here even though the tests never open one: Workout.jsx reads
  // sessionNoteSheet during render, so a missing export is a render crash, not a no-op.
  exerciseNoteSheet: vi.fn(),
  sessionNoteSheet: vi.fn(),
}))
vi.mock('../components/Media.jsx', () => ({ default: () => null }))
// api.js reads navigator.userAgent at module scope. This file installs its own DOM inside the
// tests rather than declaring a vitest environment, so it must not depend on an ambient one.
vi.mock('../lib/api.js', () => ({
  api: vi.fn(() => Promise.resolve({})),
  IS_APPLE: false, IS_ANDROID: false, BIO: 'biometrics',
}))

let dom
let root
let container

function exercise(id, sets, extra = {}) {
  return {
    id,
    target: { mode: 'reps', reps: 5, weight: 60, bodyweight: false },
    sets: sets.map(done => ({ w: 60, r: 5, done })),
    ...extra,
  }
}

function workout(entries, cur = 0, overrides = {}) {
  const { active: activeOverrides = {}, ...stateOverrides } = overrides
  return {
    unit: 'kg', restSec: 90, sound: false, effort: 'none', gifSize: 'full',
    workouts: [], exWeights: {}, routines: [],
    active: { id: 'active', name: 'Test workout', start: Date.now(), cur, entries, ...activeOverrides },
    ...stateOverrides,
  }
}

function installDom() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'Node', 'Element', 'Event', 'Blob']) globalThis[key] = dom[key]
  dom.Element.prototype.scrollIntoView = vi.fn(function (options) {
    mocks.scrollCalls.push({ node: this, options })
  })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
}

async function mount(entries, cur = 0, overrides = {}) {
  mocks.S = workout(entries, cur, overrides)
  installDom()
  await act(async () => { root.render(React.createElement(Workout)) })
}

async function unmount() {
  if (!root) return
  await act(async () => { root.unmount() })
  root = null
  container = null
  dom = null
}

async function toggleSet(index) {
  const checkbox = container.querySelectorAll('[role="checkbox"]')[index]
  expect(checkbox).toBeTruthy()
  await act(async () => { checkbox.dispatchEvent(new dom.Event('click', { bubbles: true })) })
}

async function pressProgression(index = 0) {
  const button = container.querySelectorAll('.progline')[index]
  expect(button).toBeTruthy()
  await act(async () => { button.dispatchEvent(new dom.Event('click', { bubbles: true })) })
  return button
}

async function requestDiscard() {
  const button = container.querySelector('button[aria-label="Discard"]')
  expect(button).toBeTruthy()
  await act(async () => { button.dispatchEvent(new dom.Event('click', { bubbles: true })) })
}

async function rerender() {
  await act(async () => { root.render(React.createElement(Workout)) })
}

async function addExerciseThroughSheets(ex = { id: 'added-exercise' }, cfg = { mode: 'reps', sets: 1, reps: 5, weight: 0 }) {
  const addButton = [...container.querySelectorAll('button')]
    .find(button => button.textContent.trim() === 'Add exercise')
  expect(addButton).toBeTruthy()
  await act(async () => { addButton.dispatchEvent(new dom.Event('click', { bubbles: true })) })

  const pickerCall = mocks.exercisePicker.mock.calls.at(-1)
  expect(pickerCall?.[0]).toEqual(expect.any(Function))
  await act(async () => { pickerCall[0](ex) })

  const configCall = mocks.exConfigSheet.mock.calls.at(-1)
  expect(configCall?.[2]).toEqual(expect.any(Function))
  await act(async () => { configCall[2](cfg) })
}

async function rerenderAt(cur) {
  mocks.S.active.cur = cur
  await act(async () => { root.render(React.createElement(Workout)) })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.timer = null
  mocks.work = null
  mocks.scrollCalls.length = 0
})

afterEach(async () => {
  await unmount()
})

describe('Workout set completion flow', () => {
  it('starts rest after a non-final ordinary set, but stops rest without restarting it on the final set', async () => {
    await mount([exercise('plain-bench', [false, false, false])])
    await toggleSet(0)

    expect(mocks.startRest).toHaveBeenCalledOnce()
    expect(mocks.startRest).toHaveBeenCalledWith(90, expect.any(Number))
    expect(mocks.stopRest).not.toHaveBeenCalled()

    await unmount()
    vi.clearAllMocks()
    await mount([exercise('plain-treadmill', [false], {
      target: { mode: 'cardio', min: 20, speed: 8 },
    })])
    await toggleSet(0)

    expect(mocks.stopRest).toHaveBeenCalledOnce()
    expect(mocks.startRest).not.toHaveBeenCalled()
  })

  it.each(['warmup', 'warm-up', 'warm_up'])(
    'does not start transition rest before an incomplete %s row in the next ordinary exercise',
    async phase => {
      await mount([
        exercise('current', [false], { asked: true }),
        exercise('next', [false, false], {
          asked: true,
          sets: [
            { w: 30, r: 5, done: false, phase },
            { w: 60, r: 5, done: false },
          ],
        }),
      ])

      await toggleSet(0)

      expect(mocks.S.active.cur).toBe(1)
      expect(mocks.startRest).not.toHaveBeenCalled()
    },
  )

  it('does not start transition rest when a completed superset advances to an incomplete warm-up', async () => {
    await mount([
      exercise('superset-a', [true], { sg: 'group', asked: true }),
      exercise('superset-b', [false], { sg: 'group', asked: true }),
      exercise('next', [false, false], {
        asked: true,
        sets: [
          { w: 30, r: 5, done: false, phase: 'warmup' },
          { w: 60, r: 5, done: false },
        ],
      }),
    ], 1)

    await toggleSet(1)

    expect(mocks.S.active.cur).toBe(2)
    expect(mocks.startRest).not.toHaveBeenCalled()
  })

  it('does not start transition rest before a warm-up while top-weight confirmation owns navigation', async () => {
    await mount([
      exercise('current-loaded', [false]),
      exercise('next', [false, false], {
        asked: true,
        sets: [
          { w: 30, r: 5, done: false, phase: 'warmup' },
          { w: 60, r: 5, done: false },
        ],
      }),
    ])

    await toggleSet(0)

    expect(mocks.topWeightSheet).toHaveBeenCalledWith(0)
    expect(mocks.S.active.cur).toBe(0)
    expect(mocks.startRest).not.toHaveBeenCalled()
  })

  it('does not restart transition rest when re-checking a completed unit before an incomplete warm-up', async () => {
    await mount([
      exercise('current', [true], { asked: true }),
      exercise('next', [false, false], {
        asked: true,
        sets: [
          { w: 30, r: 5, done: false, phase: 'warmup' },
          { w: 60, r: 5, done: false },
        ],
      }),
    ])

    await toggleSet(0)
    await rerender()
    await toggleSet(0)

    expect(mocks.S.active.cur).toBe(0)
    expect(mocks.startRest).not.toHaveBeenCalled()
  })

  it('leaves a completed superset selected while its top-weight sheet owns the advance choice', async () => {
    const group = 'superset-1'
    await mount([
      exercise('superset-a', [true, true, true], { sg: group, asked: true }),
      exercise('superset-b', [true, true, false], { sg: group }),
      exercise('next-exercise', [false, false, false]),
    ], 1)
    await toggleSet(5)

    expect(mocks.topWeightSheet).toHaveBeenCalledWith(1)
    expect(mocks.S.active.cur).toBe(1)
    expect(mocks.startRest).toHaveBeenCalledWith(90, expect.any(Number))
  })

  it('skips completed intervening units and selects the next unfinished superset as one unit', async () => {
    await mount([
      exercise('current-hold', [false], { asked: true, target: { mode: 'time', sec: 30, weight: 0 } }),
      exercise('already-done', [true], { asked: true }),
      exercise('pending-a', [false], { sg: 'pending-group' }),
      exercise('pending-b', [false], { sg: 'pending-group' }),
    ])

    await toggleSet(0)

    expect(mocks.S.active.cur).toBe(2)
    expect(mocks.workoutCompleteSheet).not.toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith('Hold logged')
    expect(mocks.startRest).toHaveBeenCalledWith(90, expect.any(Number))
  })

  it('wraps to earlier unfinished work instead of showing a false completion prompt', async () => {
    await mount([
      exercise('pending-earlier', [false], { asked: true }),
      exercise('current-hold', [false], { asked: true, target: { mode: 'time', sec: 30, weight: 0 } }),
    ], 1)

    await toggleSet(0)

    expect(mocks.S.active.cur).toBe(0)
    expect(mocks.workoutCompleteSheet).not.toHaveBeenCalled()
    expect(mocks.startRest).toHaveBeenCalledWith(90, expect.any(Number))
  })

  it('keeps top-weight confirmation in control without declaring completion while work remains', async () => {
    await mount([
      exercise('current-loaded', [false]),
      exercise('pending', [false], { asked: true }),
    ])

    await toggleSet(0)

    expect(mocks.topWeightSheet).toHaveBeenCalledWith(0)
    expect(mocks.workoutCompleteSheet).not.toHaveBeenCalled()
    expect(mocks.S.active.cur).toBe(0)
  })

  it('shows workout completion only when no unfinished unit remains', async () => {
    await mount([
      exercise('already-done', [true], { asked: true }),
      exercise('final-hold', [false], { asked: true, target: { mode: 'time', sec: 30, weight: 0 } }),
    ], 1)

    await toggleSet(0)

    expect(mocks.workoutCompleteSheet).toHaveBeenCalledOnce()
    expect(mocks.startRest).not.toHaveBeenCalled()
  })
})

describe('Workout add exercise flow', () => {
  it.each([
    ['freestyle', {}],
    ['planned', {
      active: { routineId: 'routine-1' },
      routines: [{ id: 'routine-1', ex: [] }],
    }],
  ])('inserts after the current unit and continues to pending work in a %s session', async (_label, overrides) => {
    await mount([
      exercise('current', [true], { asked: true }),
      exercise('pending', [false], { asked: true }),
    ], 0, overrides)

    await addExerciseThroughSheets(
      { id: 'inserted' },
      { mode: 'time', sets: 1, sec: 30, weight: 0 },
    )

    expect(mocks.S.active.entries.map(entry => entry.id)).toEqual(['current', 'inserted', 'pending'])
    expect(mocks.S.active.cur).toBe(1)

    await rerender()
    await toggleSet(0)

    expect(mocks.S.active.entries[1].sets[0].done).toBe(true)
    expect(mocks.S.active.cur).toBe(2)
    expect(mocks.workoutCompleteSheet).not.toHaveBeenCalled()
  })

  it('inserts after the complete current superset without splitting the group', async () => {
    await mount([
      exercise('current-a', [true], { sg: 'current-group', asked: true }),
      exercise('current-b', [true], { sg: 'current-group', asked: true }),
      exercise('pending', [false], { asked: true }),
    ])

    await addExerciseThroughSheets({ id: 'inserted' })

    expect(mocks.S.active.entries.map(entry => entry.id)).toEqual([
      'current-a', 'current-b', 'inserted', 'pending',
    ])
    expect(mocks.S.active.entries.slice(0, 2).map(entry => entry.sg)).toEqual([
      'current-group', 'current-group',
    ])
    expect(mocks.S.active.cur).toBe(2)
  })
})

describe('Workout discard timer lifecycle', () => {
  it('preserves active timers while discard is awaiting confirmation', async () => {
    const timer = { left: 30, total: 90, endsAt: Date.now() + 30_000 }
    const work = { left: 20, total: 45, endsAt: Date.now() + 20_000, label: 'Plank' }
    mocks.timer = timer
    mocks.work = work
    await mount([exercise('timed-plank', [false])])

    await requestDiscard()

    expect(mocks.confirmSheet).toHaveBeenCalledOnce()
    expect(mocks.timer).toBe(timer)
    expect(mocks.work).toBe(work)
    expect(mocks.stopRest).not.toHaveBeenCalled()
    expect(mocks.stopWork).not.toHaveBeenCalled()
    expect(mocks.S.active).not.toBeNull()
  })

  it('clears rest and work timers only after discard is confirmed', async () => {
    mocks.timer = { left: 30, total: 90, endsAt: Date.now() + 30_000 }
    mocks.work = { left: 20, total: 45, endsAt: Date.now() + 20_000, label: 'Plank' }
    await mount([exercise('timed-plank', [false])])
    await requestDiscard()

    await act(async () => { mocks.confirmSheet.mock.calls[0][0].onConfirm() })

    expect(mocks.S.active).toBeNull()
    expect(mocks.timer).toBeNull()
    expect(mocks.work).toBeNull()
    expect(mocks.stopRest).toHaveBeenCalledOnce()
    expect(mocks.stopWork).toHaveBeenCalledOnce()
  })
})

describe('progression guidance', () => {
  it('labels the visible outcome with the policy that calculated it', async () => {
    await mount([exercise('plain-bench', [false, false, false], {
      plan: {
        policy: 'linear',
        kind: 'up',
        weight: 62.5,
        why: ['Every rep last time — {0} {1} more.', 2.5, 'kg'],
      },
    })])

    expect(container.querySelector('.progline')?.textContent)
      .toContain('Linear progression · Every rep last time — 2.5 kg more.')
  })

  it('is a keyboard-accessible button that opens settings for the pressed grouped entry', async () => {
    const plan = {
      policy: 'linear', kind: 'up', weight: 62.5,
      why: ['Every rep last time — {0} {1} more.', 2.5, 'kg'],
    }
    const first = exercise('plain-bench', [false], { sg: 'group', plan })
    const second = exercise('plain-bench', [false], {
      sg: 'group', plan, target: { mode: 'reps', reps: 8, weight: 80, bodyweight: false },
    })
    await mount([first, second])
    const firstBefore = JSON.stringify(mocks.S.active.entries[0])

    const button = await pressProgression(1)

    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-label')).toBe('Open progression settings')
    expect(mocks.exConfigSheet).toHaveBeenCalledOnce()
    expect(mocks.exConfigSheet.mock.calls[0][1]).toBe(second.target)
    expect(mocks.exConfigSheet.mock.calls[0][4]).toBe(mocks.S.routines[0])

    mocks.exConfigSheet.mock.calls[0][2]({ ...second.target, prog: 'double', repsMin: 6 })
    expect(JSON.stringify(mocks.S.active.entries[0])).toBe(firstBefore)
    expect(mocks.S.active.entries[1].target.prog).toBe('double')
    expect(mocks.S.active.cur).toBe(0)
  })

  it('leaves the active entry unchanged when progression settings are cancelled', async () => {
    const entry = exercise('plain-bench', [true, false], {
      plan: {
        policy: 'linear', kind: 'up', weight: 62.5,
        why: ['Every rep last time — {0} {1} more.', 2.5, 'kg'],
      },
    })
    await mount([entry])
    const before = JSON.stringify(mocks.S.active.entries[0])

    await pressProgression()

    expect(JSON.stringify(mocks.S.active.entries[0])).toBe(before)
  })

  it('saves the active policy, preserves completed rows, and refreshes guidance immediately', async () => {
    const entry = exercise('plain-bench', [true, false], {
      plan: {
        policy: 'linear', kind: 'up', weight: 62.5,
        why: ['Every rep last time — {0} {1} more.', 2.5, 'kg'],
      },
    })
    await mount([entry])
    mocks.S.workouts = [{
      d: '2026-08-27',
      entries: [{
        id: entry.id,
        target: { sets: 2, reps: 5, weight: 60 },
        sets: [{ w: 60, r: 5, done: true }, { w: 60, r: 5, done: true }],
      }],
    }]
    const completed = mocks.S.active.entries[0].sets[0]
    await pressProgression()
    const save = mocks.exConfigSheet.mock.calls[0][2]

    await act(async () => {
      save({ ...entry.target, prog: 'double', repsMin: 3 })
      root.render(React.createElement(Workout))
    })

    const saved = mocks.S.active.entries[0]
    expect(saved.target.prog).toBe('double')
    expect(saved.sets[0]).toEqual(completed)
    expect(saved.sets[0]).toEqual({ w: 60, r: 5, done: true })
    expect(saved.sets[1]).toEqual({ w: 62.5, r: 3, done: false })
    expect(container.querySelector('.progline')?.textContent)
      .toContain('Double progression · Top of the rep range in every set — 2.5 kg more, back to 3 reps.')

    const persisted = JSON.parse(JSON.stringify(mocks.S))
    await unmount()
    mocks.S = persisted
    installDom()
    await act(async () => { root.render(React.createElement(Workout)) })
    expect(container.querySelector('.progline')?.textContent)
      .toContain('Double progression · Top of the rep range in every set — 2.5 kg more, back to 3 reps.')
  })
})

describe('superset flow survives an exercise being removed mid-session', () => {
  // removeActiveExercise splices A.entries, shifting every index above the removal down.
  // The high-water marks are index-keyed, so without re-baselining the shifted exercise
  // inherits its predecessor's mark and its next completed set reads as an uncheck/re-check
  // — no advance, and no rest at the end of the round.
  it('still advances and rests for sets completed after a removal', async () => {
    // warm(2 sets, both done) ahead of a bench/row superset with nothing done yet.
    await mount([
      exercise('warm', [true, true]),
      exercise('bench', [false, false], { sg: 'g1' }),
      exercise('row', [false, false], { sg: 'g1' }),
    ], 1)

    // Drop the first exercise: bench moves 1 -> 0, row moves 2 -> 1.
    // Stale marks would be [2, 0, 0] against entries that are now [bench, row].
    await act(async () => {
      mocks.S.active.entries.splice(0, 1)
      mocks.S.active.cur = 0
      root.render(React.createElement(Workout))
    })
    mocks.startRest.mockClear()

    // First member of the group: real progress, so the flow advances to the partner.
    await toggleSet(0)
    await act(async () => { root.render(React.createElement(Workout)) })
    expect(mocks.S.active.cur).toBe(1)

    // Partner closes the round (each still has a second set), which is what starts the rest.
    await toggleSet(2)
    expect(mocks.startRest).toHaveBeenCalledWith(90, expect.any(Number))
  })
})

describe('superset actionable-set centring', () => {
  it('centres the newly active exercise first incomplete set row', async () => {
    await mount([
      exercise('bench', [true, false], { sg: 'g1' }),
      exercise('row', [true, false, false], { sg: 'g1' }),
    ])
    mocks.scrollCalls.length = 0

    await rerenderAt(1)

    const rows = container.querySelector('[data-exidx="1"]').querySelectorAll('.setrow')
    expect(mocks.scrollCalls).toEqual([
      { node: rows[1], options: { behavior: 'smooth', block: 'center' } },
    ])
  })

  it('centres the last set row when the newly active exercise is complete', async () => {
    await mount([
      exercise('bench', [true, false], { sg: 'g1' }),
      exercise('row', [true, true], { sg: 'g1' }),
    ])
    mocks.scrollCalls.length = 0

    await rerenderAt(1)

    const rows = container.querySelector('[data-exidx="1"]').querySelectorAll('.setrow')
    expect(mocks.scrollCalls).toEqual([
      { node: rows[1], options: { behavior: 'smooth', block: 'center' } },
    ])
  })

  it('centres the exercise wrapper when the newly active exercise has no set row', async () => {
    await mount([
      exercise('bench', [true, false], { sg: 'g1' }),
      exercise('row', [], { sg: 'g1' }),
    ])
    mocks.scrollCalls.length = 0

    await rerenderAt(1)

    const wrapper = container.querySelector('[data-exidx="1"]')
    expect(mocks.scrollCalls).toEqual([
      { node: wrapper, options: { behavior: 'smooth', block: 'center' } },
    ])
  })

  it('does not auto-scroll set rows for ordinary exercise navigation', async () => {
    await mount([
      exercise('bench', [true, false]),
      exercise('row', [false, false]),
    ])
    mocks.scrollCalls.length = 0

    await rerenderAt(1)

    expect(mocks.scrollCalls).toEqual([])
  })
})

describe('active workout whole-unit move controls', () => {
  const action = label => container.querySelector(`button[aria-label="${label}"]`)

  it('shows labelled controls and moves the selected standalone exercise one unit', async () => {
    const selected = exercise('duplicate', [false], {
      occurrenceId: 'duplicate#2',
      target: { mode: 'reps', reps: 7, weight: 82.5, notes: 'Keep this target' },
      sets: [{ w: 77.5, r: 6, done: true, rir: 2 }],
    })
    await mount([
      exercise('duplicate', [false], { occurrenceId: 'duplicate#1' }),
      exercise('middle', [false]),
      selected,
    ], 2)

    expect(action('Move up')?.textContent.trim()).toBe('Move up')
    expect(action('Move down')?.textContent.trim()).toBe('Move down')
    await act(async () => { action('Move up').dispatchEvent(new dom.Event('click', { bubbles: true })) })

    expect(mocks.S.active.entries.map(entry => entry.occurrenceId || entry.id)).toEqual(['duplicate#1', 'duplicate#2', 'middle'])
    expect(mocks.S.active.entries[1]).toEqual(selected)
    expect(mocks.S.active.entries[1].target).toEqual({ mode: 'reps', reps: 7, weight: 82.5, notes: 'Keep this target' })
    expect(mocks.S.active.entries[1].sets).toEqual([{ w: 77.5, r: 6, done: true, rir: 2 }])
    expect(mocks.S.active.cur).toBe(1)
    expect(mocks.stopWork).toHaveBeenCalledOnce()
    expect(mocks.stopRest).not.toHaveBeenCalled()
  })

  it('moves the selected contiguous group as one unit without changing its metadata', async () => {
    const first = exercise('group-a', [false], { sg: 'pair', occurrenceId: 'group-a#1' })
    const selected = exercise('group-b', [true], { sg: 'pair', occurrenceId: 'group-b#1' })
    const groupMeta = { pair: { kind: 'complex', label: 'Carry pair', cues: 'Stay braced.' } }
    await mount([
      exercise('before', [false]),
      first,
      selected,
      exercise('after', [false]),
    ], 2)
    mocks.S.active.groupMeta = groupMeta

    await act(async () => { action('Move up').dispatchEvent(new dom.Event('click', { bubbles: true })) })

    expect(mocks.S.active.entries.map(entry => entry.id)).toEqual(['group-a', 'group-b', 'before', 'after'])
    expect(mocks.S.active.entries.slice(0, 2)).toEqual([first, selected])
    expect(mocks.S.active.entries.slice(0, 2).map(entry => entry.sg)).toEqual(['pair', 'pair'])
    expect(mocks.S.active.groupMeta).toEqual(groupMeta)
    expect(mocks.S.active.entries[mocks.S.active.cur]).toEqual(selected)
  })

  it('disables both moves while a work timer can still write by index', async () => {
    mocks.work = { left: 5, total: 5, endsAt: Date.now() + 5000 }
    await mount([exercise('first', [false]), exercise('second', [false])], 1)

    expect(action('Move up')?.disabled).toBe(true)
    expect(action('Move down')?.disabled).toBe(true)
  })
})

describe('active exercise swap control', () => {
  it('opens the swap flow for the selected duplicate occurrence', async () => {
    await mount([exercise('bench', [false]), exercise('bench', [false]), exercise('row', [false])], 1)

    const swap = container.querySelector('button[aria-label="Swap exercise"]')
    expect(swap).toBeTruthy()
    await act(async () => { swap.dispatchEvent(new dom.Event('click', { bubbles: true })) })

    expect(mocks.swapActiveWorkoutExercise).toHaveBeenCalledOnce()
    expect(mocks.swapActiveWorkoutExercise).toHaveBeenCalledWith(1)
  })
})
