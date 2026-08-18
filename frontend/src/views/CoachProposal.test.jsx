import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CoachProposal from './CoachProposal.jsx'
import { applyCreatedPlan } from '../lib/coach.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'

// Accepting a plan used to end on /plan, a screen with no notion of today and no way to start
// anything. These tests pin the destination, and — more to the point — that the destination can
// actually start today's session through the app's one start path rather than a second copy.
const mocks = vi.hoisted(() => {
  const state = { S: null, pending: null, nav: vi.fn(), toast: vi.fn() }
  state.storeSnapshot = () => ({
    S: state.S,
    user: { id: 'u1' },
    config: { coach: { enabled: true } },
    update: mut => mut(state.S),
  })
  state.uiSnapshot = () => ({ toast: state.toast })
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
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.nav }))
vi.mock('../lib/coach-api.js', () => ({
  useCoachStatus: () => ({ pending: mocks.pending, loading: false, refresh: vi.fn() }),
  resolvePending: vi.fn(() => Promise.resolve({})),
  refinePlan: vi.fn(() => Promise.resolve({})),
}))
vi.mock('../sheets.jsx', () => ({ startFlow: vi.fn(), confirmSheet: vi.fn() }))
vi.mock('../components/BodyMap.jsx', () => ({ default: () => null }))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(() => Promise.resolve({})),
  IS_APPLE: false, IS_ANDROID: false, BIO: 'biometrics',
}))

let dom, root, container

const TODAY_WD = new Date(todayISO() + 'T12:00:00').getDay()

// A plan that trains every day, so "today" has a session whatever day the suite runs on.
const bundle = (week) => ({
  opengym_plan: 1, name: 'Coach plan', summary: 'a plan',
  week,
  routines: [{ id: 'x1', name: 'Full body A', emoji: '💪', ex: [{ id: '0001', sets: 3, reps: 10, mode: 'reps' }] }],
  customEx: [],
})
const everyDay = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [d, 'x1']))

const state = () => ({
  unit: 'kg', lang: 'en', customEx: [], workouts: [], bodyweight: [], exWeights: {},
  dayPlan: {}, routines: [], week: {},
  coach: { consent: { agreedAt: '2026-07-01T00:00:00Z', version: 1 }, log: [], snapshots: [] },
})

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

async function mount(pending) {
  mocks.S = state()
  mocks.pending = pending
  installDom()
  await act(async () => { root.render(React.createElement(CoachProposal)) })
}

const byText = re => [...container.querySelectorAll('button')].find(b => re.test(b.textContent || ''))

async function click(el) {
  expect(el).toBeTruthy()
  await act(async () => { el.dispatchEvent(new dom.Event('click', { bubbles: true })) })
}

beforeEach(() => { vi.clearAllMocks() })
afterEach(async () => {
  if (root) { await act(async () => { root.unmount() }); root = null }
  container = null; dom = null
})

describe('accepting a created plan hands off to training', () => {
  it('lands on the screen that knows about today when it took the schedule', async () => {
    await mount({ id: 'p1', kind: 'create', bundle: bundle(everyDay) })
    await click(byText(/Accept plan/))
    expect(mocks.nav).toHaveBeenCalledWith('/home')
  })

  it('leaves the user on the plan screen when the schedule was declined', async () => {
    await mount({ id: 'p1', kind: 'create', bundle: bundle(everyDay) })
    const sw = container.querySelector('[role="switch"]')
    expect(sw.getAttribute('aria-checked')).toBe('true')   // on by default
    await click(sw)
    await click(byText(/Accept plan/))
    expect(mocks.nav).toHaveBeenCalledWith('/plan')
  })

  it('leaves today startable through the app’s one start path', async () => {
    // What the destination can actually do: the same lookup Home does on render resolves a
    // routine with exercises, which is exactly what it hands to startFlow.
    const s = state()
    applyCreatedPlan(s, { id: 'p1', kind: 'create', bundle: bundle(everyDay) }, { schedule: true })
    const todays = effectiveRoutine(s, todayISO())
    expect(todays).toBeTruthy()
    expect(todays.ex.length).toBeGreaterThan(0)
    expect(s.week[TODAY_WD]).toBe(todays.id)
  })
})
