import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'

const mocks = vi.hoisted(() => {
  const state = {
    S: null,
    startRest: vi.fn(),
    stopRest: vi.fn(),
    topWeightSheet: vi.fn(),
  }
  state.storeSnapshot = () => ({
    S: state.S,
    user: null,
    update: mut => mut(state.S),
  })
  state.uiSnapshot = () => ({
    work: null,
    startRest: state.startRest,
    stopRest: state.stopRest,
    startWork: vi.fn(),
    toast: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  await unmount()
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
