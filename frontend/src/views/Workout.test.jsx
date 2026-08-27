import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'

const mocks = vi.hoisted(() => {
  const state = {
    S: null,
    cloneOnUpdate: false,
    startRest: vi.fn(),
    stopRest: vi.fn(),
    startWork: vi.fn(),
    toast: vi.fn(),
    timer: null,
    topWeightSheet: vi.fn(),
  }
  state.update = vi.fn(mut => {
    if (state.cloneOnUpdate) {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    } else mut(state.S)
  })
  state.storeSnapshot = () => ({
    S: state.S,
    user: null,
    update: state.update,
  })
  state.uiSnapshot = () => ({
    work: null,
    timer: state.timer,
    startRest: state.startRest,
    stopRest: state.stopRest,
    startWork: state.startWork,
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
  exercisePicker: vi.fn(),
  exConfigSheet: vi.fn(),
  exerciseDetailSheet: vi.fn(),
  topWeightSheet: mocks.topWeightSheet,
  finishWorkout: vi.fn(),
  workoutCompleteSheet: vi.fn(),
  confirmSheet: vi.fn(),
  // Both note sheets belong here even though the tests never open one: Workout.jsx reads
  // sessionNoteSheet during render, so a missing export is a render crash, not a no-op.
  exerciseNoteSheet: vi.fn(),
  sessionNoteSheet: vi.fn(),
}))
vi.mock('../components/Media.jsx', () => ({
  default: () => React.createElement('div', { className: 'exmedia' },
    React.createElement('button', { 'aria-label': 'Minimize media' }, 'Media')),
}))
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

function workout(entries, cur = 0) {
  return {
    unit: 'kg', restSec: 90, sound: false, effort: 'none', gifSize: 'full',
    workouts: [], exWeights: {}, routines: [],
    active: { id: 'active', name: 'Test workout', start: Date.now(), cur, entries },
  }
}

function installDom() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'Node', 'Element', 'Event', 'Blob']) globalThis[key] = dom[key]
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
}

async function mount(entries, cur = 0) {
  mocks.S = workout(entries, cur)
  installDom()
  await act(async () => { root.render(React.createElement(Workout)) })
}

async function mountState(state) {
  mocks.S = state
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

function pointerEvent(type, { x, y, pointerId = 1, pointerType = '' }) {
  const event = new dom.Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  })
  return event
}

async function swipe(target, from, to, pointerType = '') {
  await act(async () => {
    target.dispatchEvent(pointerEvent('pointerdown', { x: from[0], y: from[1], pointerType }))
    target.dispatchEvent(pointerEvent('pointerup', { x: to[0], y: to[1], pointerType }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.cloneOnUpdate = false
  mocks.timer = null
})

afterEach(async () => {
  await unmount()
})

describe('Workout swipe navigation', () => {
  it('moves left from one exercise to the next unit exactly once', async () => {
    await mount([exercise('first', [false]), exercise('second', [false])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    expect(surface).toBeTruthy()
    await swipe(surface, [160, 200], [90, 202])

    expect(mocks.S.active.cur).toBe(1)
  })

  it('navigates through the production-shaped cloned update boundary', async () => {
    mocks.cloneOnUpdate = true
    await mount([exercise('first', [false]), exercise('second', [false])])

    await swipe(container.querySelector('[data-testid="workout-swipe-surface"]'), [160, 200], [90, 202])

    expect(mocks.S.active.cur).toBe(1)
  })

  it('moves right to the previous unit without wrapping at either boundary', async () => {
    await mount([exercise('first', [false]), exercise('second', [false])], 1)
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    await swipe(surface, [90, 200], [160, 202])
    expect(mocks.S.active.cur).toBe(0)
    mocks.update.mockClear()
    await swipe(surface, [90, 200], [160, 202])
    expect(mocks.S.active.cur).toBe(0)
    expect(mocks.update).not.toHaveBeenCalled()

    mocks.S.active.cur = 1
    await swipe(surface, [160, 200], [90, 202])
    expect(mocks.S.active.cur).toBe(1)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it.each([
    ['vertical', [160, 200], [150, 280], ''],
    ['short', [160, 200], [120, 200], ''],
    ['diagonal', [160, 200], [80, 270], ''],
    ['mouse', [160, 200], [90, 202], 'mouse'],
  ])('ignores a %s pointer sequence', async (_label, from, to, pointerType) => {
    await mount([exercise('first', [false]), exercise('second', [false])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')
    const down = pointerEvent('pointerdown', { x: from[0], y: from[1], pointerType })
    const up = pointerEvent('pointerup', { x: to[0], y: to[1], pointerType })

    await act(async () => {
      surface.dispatchEvent(down)
      surface.dispatchEvent(up)
    })

    expect(mocks.S.active.cur).toBe(0)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(down.defaultPrevented).toBe(false)
    expect(up.defaultPrevented).toBe(false)
  })

  it('cleans up a cancelled pointer without navigating on its later release', async () => {
    await mount([exercise('first', [false]), exercise('second', [false])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    await act(async () => {
      surface.dispatchEvent(pointerEvent('pointerdown', { x: 160, y: 200 }))
      surface.dispatchEvent(pointerEvent('pointercancel', { x: 120, y: 200 }))
      surface.dispatchEvent(pointerEvent('pointerup', { x: 80, y: 200 }))
    })

    expect(mocks.S.active.cur).toBe(0)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('cleans up when the active pointer capture is lost', async () => {
    await mount([exercise('first', [false]), exercise('second', [false])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    await act(async () => {
      surface.dispatchEvent(pointerEvent('pointerdown', { x: 160, y: 200 }))
      surface.dispatchEvent(pointerEvent('lostpointercapture', { x: 120, y: 200 }))
      surface.dispatchEvent(pointerEvent('pointerup', { x: 80, y: 200 }))
    })

    expect(mocks.S.active.cur).toBe(0)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('crosses a whole contiguous superset in both directions', async () => {
    const entries = [
      exercise('first', [false]),
      exercise('group-a', [false], { sg: 'g' }),
      exercise('group-b', [false], { sg: 'g' }),
      exercise('last', [false]),
    ]
    await mount(entries, 1)
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    await swipe(surface, [160, 200], [90, 202])
    expect(mocks.S.active.cur).toBe(3)
    mocks.S.active.cur = 3
    await swipe(surface, [90, 200], [160, 202])
    expect(mocks.S.active.cur).toBe(1)
  })

  it('keeps duplicate exercise occurrences and their sets unchanged', async () => {
    const entries = [exercise('bench', [false]), exercise('row', [false]), exercise('bench', [true])]
    const references = [...entries]
    await mount(entries, 2)
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    await swipe(surface, [90, 200], [160, 202])

    expect(mocks.S.active.cur).toBe(1)
    expect(mocks.S.active.entries).toEqual(references)
    expect(mocks.S.active.entries[0]).toBe(references[0])
    expect(mocks.S.active.entries[2]).toBe(references[2])
  })

  it('leaves interactive controls and media in charge of their own gestures', async () => {
    await mount([exercise('first', [false]), exercise('second', [false])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')
    const targets = [
      surface.querySelector('[role="checkbox"]'),
      surface.querySelector('input'),
      surface.querySelector('button[aria-label="Note"]'),
      surface.querySelector('.exmedia'),
      surface.querySelector('.exmedia button'),
    ]
    expect(targets.every(Boolean)).toBe(true)

    for (const target of targets) await swipe(target, [160, 200], [80, 202], 'touch')

    expect(mocks.S.active.cur).toBe(0)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('changes only the cursor while leaving running timer state and callbacks untouched', async () => {
    mocks.timer = { left: 42, running: true }
    const entries = [exercise('first', [false]), exercise('second', [false])]
    await mount(entries)
    const before = structuredClone(mocks.S)

    await swipe(container.querySelector('[data-testid="workout-swipe-surface"]'), [160, 200], [90, 202], 'pen')

    expect(mocks.S).toEqual({ ...before, active: { ...before.active, cur: 1 } })
    expect(mocks.S.active.entries[0]).toBe(entries[0])
    expect(mocks.timer).toEqual({ left: 42, running: true })
    expect(mocks.startRest).not.toHaveBeenCalled()
    expect(mocks.stopRest).not.toHaveBeenCalled()
    expect(mocks.startWork).not.toHaveBeenCalled()
    expect(mocks.topWeightSheet).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledOnce()
  })

  it('keeps semantic Prev and Next buttons as the non-gesture path', async () => {
    await mount([exercise('first', [false]), exercise('second', [false])])
    const buttons = [...container.querySelectorAll('button')]
    const prev = buttons.find(button => button.textContent.trim() === 'Prev')
    const next = buttons.find(button => button.textContent.trim() === 'Next')
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    expect(prev.disabled).toBe(true)
    expect(next.disabled).toBe(false)
    expect(surface.getAttribute('role')).toBeNull()
    expect(surface.getAttribute('tabindex')).toBeNull()
    await act(async () => { next.dispatchEvent(new dom.Event('click', { bubbles: true })) })
    expect(mocks.S.active.cur).toBe(1)
  })

  it('uses fresh cursor state at release time', async () => {
    await mount([exercise('first', [false]), exercise('second', [false]), exercise('third', [false])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    await act(async () => {
      surface.dispatchEvent(pointerEvent('pointerdown', { x: 160, y: 200 }))
      mocks.S.active.cur = 1
      surface.dispatchEvent(pointerEvent('pointerup', { x: 90, y: 202 }))
    })

    expect(mocks.S.active.cur).toBe(2)
  })

  it('accepts the exact distance and axis-dominance thresholds', async () => {
    await mount([exercise('first', [false]), exercise('second', [false]), exercise('third', [false])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    await swipe(surface, [100, 100], [52, 100])
    expect(mocks.S.active.cur).toBe(1)
    await swipe(surface, [100, 100], [50, 140])

    expect(mocks.S.active.cur).toBe(2)
  })

  it('renders safely with no active workout or with an empty active workout', async () => {
    const missing = workout([])
    missing.active = null
    missing.week = {}
    missing.dayPlan = {}
    await mountState(missing)
    expect(container.querySelector('[data-testid="workout-swipe-surface"]')).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()

    await unmount()
    await mount([])
    expect(container.querySelector('[data-testid="workout-swipe-surface"]')).toBeNull()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('fails closed for an invalid negative cursor', async () => {
    await mount([exercise('first', [false]), exercise('second', [false])], -1)
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')

    await swipe(surface, [160, 200], [90, 202])

    expect(mocks.S.active.cur).toBe(-1)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('Workout set completion flow', () => {
  it('starts rest after a non-final ordinary set, but stops rest without restarting it on the final set', async () => {
    await mount([exercise('plain-bench', [false, false, false])])
    await toggleSet(0)

    expect(mocks.startRest).toHaveBeenCalledOnce()
    expect(mocks.startRest).toHaveBeenCalledWith(90)
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
    expect(mocks.startRest).toHaveBeenCalledWith(90)
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
    expect(mocks.startRest).toHaveBeenCalledWith(90)
  })
})
