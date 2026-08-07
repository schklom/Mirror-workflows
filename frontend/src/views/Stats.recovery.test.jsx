import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { parseHTML } from 'linkedom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MUSCLES, MUSCLE_NAME, levelsOf, rankOf } from '../lib/muscles.js'
import { FATIGUE_STATES, STRENGTH_FLOOR } from '../lib/recovery.js'
import { fatigueStateOf } from '../lib/recovery-view.js'
import Stats, { weeksSinceTraining } from './Stats.jsx'

const DAY = 86400000
const HOUR = 3600000
const BASE_NOW = Date.UTC(2026, 0, 22, 12)

const mocks = vi.hoisted(() => ({
  maps: [],
  mapMounts: 0,
  S: {
    unit: 'kg', body: 'male', effort: 'rir', targetW: null,
    bodyweight: [], routines: [], workouts: [],
  },
}))

vi.mock('../store/useStore.js', () => ({
  useStore: selector => selector({ S: mocks.S }),
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  bwSheet: () => {}, goalSheet: () => {}, calendarSheet: () => {}, workoutDetailSheet: () => {},
  WorkoutRow: () => React.createElement('div'), bwDeltaColor: () => 'inherit',
}))
vi.mock('../components/LineChart.jsx', () => ({ default: () => React.createElement('div') }))
vi.mock('../components/Heatmap.jsx', () => ({ default: () => React.createElement('div') }))
vi.mock('../components/Icon.jsx', () => ({ default: props => React.createElement('span', props) }))
vi.mock('../components/BodyMap.jsx', () => ({
  default: props => {
    mocks.maps.push(props)
    React.useEffect(() => {
      mocks.mapMounts++
      return () => {}
    }, [])
    return React.createElement(
      'div',
      { 'data-body-map': true, 'data-selected-muscle': props.selected || '' },
      React.createElement('button', {
        'data-muscle': 'chest',
        onClick: () => props.onMuscle?.('chest'),
      }, 'Chest'),
    )
  },
  BodyMapLegend: () => React.createElement('div', { 'data-balance-legend': true }),
}))

let dom
let root
let container

function iso(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function set(done, extra = {}) {
  return { done, w: 10, r: 8, unit: 'kg', ...extra }
}

function workout(id, start, entries) {
  return { id, d: iso(start), start, unit: 'kg', entries }
}

function entry(id, sets) {
  return { id, sets }
}

function lifecycleWorkouts(now = BASE_NOW) {
  // A 6-set chest day on the saturating curve crosses .5 at ~55.05 hours, so the edge
  // flips fatigued -> recovering after one 60-second interval tick.
  const fatigueEdge = now - (36 * Math.log2(6 / (3 * Math.LN2)) * HOUR - 30000)
  // This completed set is in the initial 30-day Balance window, then ages out after one tick.
  const balanceEdge = now - (30 * DAY - 30000)
  // The 14-day strength edge becomes sub-full after one tick.
  const strengthEdge = now - (14 * DAY - 30000)
  // This completed event must remain the latest training event for abs: the newer set is undone.
  const absCompleted = now - 20 * DAY
  const absUndone = now - DAY
  return [
    workout('fatigue-edge', fatigueEdge, [entry('1254', Array.from({ length: 6 }, () => set(true, { rir: 0 })))]),
    workout('balance-edge', balanceEdge, [entry('1254', [set(true, { rir: 2 })])]),
    workout('strength-edge', strengthEdge, [entry('1001', [set(true, { rir: 2 })])]),
    workout('abs-completed', absCompleted, [entry('1002', [set(true, { rir: 2 })])]),
    workout('abs-undone', absUndone, [entry('1002', [set(false, { rir: 0 })])]),
  ]
}

function allFatiguedWorkout(now = BASE_NOW) {
  // Eight completed sets per exercise: on the saturating curve every involved muscle gets
  // raw >= 3.2 (0.4 x 8), i.e. a fatigue value above the .55 top band regardless of the
  // catalogue's secondary-muscle metadata.
  const ids = [
    ['1018', 1], // trapezius
    ['1012', 1], // deltoids
    ['1167', 1], // chest
    ['1013', 1], // upper-back
    ['3011', 1], // serratus
    ['1413', 1], // biceps
    ['1399', 1], // triceps
    ['1016', 1], // forearm
    ['1005', 2], // abs + obliques
    ['1010', 1], // lower-back
    ['1003', 1], // gluteal
    ['1001', 1], // quadriceps
    ['1511', 1], // hamstring
    ['1494', 1], // adductors
    ['1002', 2], // abs + hip-flexors
    ['1000', 1], // calves
    ['1396', 2], // calves + tibialis
  ]
  return workout('all-fatigued', now, ids.map(([id]) => entry(id, Array.from({ length: 8 }, () => set(true)))))
}

function allSubfullWorkout(now = BASE_NOW) {
  return workout('all-subfull', now - 15 * DAY, [entry('1254', [set(true)])])
}

function resetFixture(workouts = lifecycleWorkouts()) {
  mocks.S.workouts = workouts
  mocks.maps.length = 0
  mocks.mapMounts = 0
}

function installDom() {
  const parsed = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  dom = parsed.window
  globalThis.window = dom
  globalThis.document = dom.document
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.navigator })
  for (const key of ['HTMLElement', 'Node', 'Element', 'Event']) globalThis[key] = dom[key]
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
}

async function mountStats() {
  installDom()
  await act(async () => { root.render(React.createElement(Stats)) })
}

async function unmountStats() {
  if (!root) return
  await act(async () => { root.unmount() })
  root = null
  container = null
  dom = null
}

function muscleCard() {
  return [...container.querySelectorAll('.card')].find(card =>
    [...card.querySelectorAll('.seg button')].some(button =>
      ['Muscle balance', 'Fatigue', 'Strength'].includes(button.textContent.trim())))
}

function buttonWithText(scope, text) {
  return [...scope.querySelectorAll('button')].find(button => button.textContent.trim() === text)
}

function viewButton(text) {
  return buttonWithText(muscleCard(), text)
}

function balanceRangeButton(text) {
  const segments = muscleCard().querySelectorAll('.seg')
  return buttonWithText(segments[1], text)
}

async function click(button) {
  expect(button, `expected a button named ${button?.textContent || 'unknown'}`).toBeTruthy()
  await act(async () => { button.dispatchEvent(new dom.Event('click', { bubbles: true })) })
}

async function tick(milliseconds) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds) })
}

function lastMap() {
  return mocks.maps.at(-1)
}

function expectPressed(button) {
  expect(button?.getAttribute('aria-pressed')).toBe('true')
}

function strengthRows() {
  return [...muscleCard().querySelectorAll('.mrow .nm')].map(node => node.textContent.trim())
}

afterEach(async () => {
  await unmountStats()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BASE_NOW)
  resetFixture()
})

describe('Stats muscle recovery view runtime', () => {
  it('starts in Balance and preserves range, hard filter, and selected muscle through every real view transition', async () => {
    await mountStats()
        const card = muscleCard()

    expectPressed(buttonWithText(card, 'Muscle balance'))
    expectPressed(buttonWithText(card, 'Week'))

    await click(balanceRangeButton('30d'))
    await click(buttonWithText(card, 'All'))
    await click(card.querySelector('[data-muscle="chest"]'))
    expectPressed(balanceRangeButton('30d'))
    expect(buttonWithText(muscleCard(), 'Hard')).toBeTruthy()
    expect(container.querySelector('[data-selected-muscle="chest"]')).toBeTruthy()

    await click(viewButton('Fatigue'))
    expect(container.textContent).toContain('Fatigue shows how recently each muscle was trained. High means rest.')
    await click(viewButton('Strength'))
    expect(container.textContent).toContain('Strength shows retained muscle strength. Train again to reset it.')
    await click(viewButton('Muscle balance'))

    expectPressed(balanceRangeButton('30d'))
    expect(buttonWithText(muscleCard(), 'Hard')).toBeTruthy()
    expect(container.querySelector('[data-selected-muscle="chest"]')).toBeTruthy()
    expect(lastMap().selected).toBe('chest')
    expect(lastMap().load.chest).toBe(7)
  })

  it('refreshes fatigue presentation, Balance 30-day filtering, and the mounted tree on the 60-second tick', async () => {
    await mountStats()
    await click(balanceRangeButton('30d'))
    await click(viewButton('Fatigue'))
    await click(muscleCard().querySelector('[data-muscle="chest"]'))

    const beforeTickMounts = mocks.mapMounts
    const beforeTick = lastMap().load.chest
    expect(fatigueStateOf(beforeTick)).toBe(FATIGUE_STATES.FATIGUED)
    expect(container.textContent).toContain('Fatigued')

    await tick(60000)

    const afterTick = lastMap().load.chest
    expect(mocks.mapMounts).toBe(beforeTickMounts)
    expect(afterTick).toBeLessThan(0.5)
    expect(fatigueStateOf(afterTick)).toBe(FATIGUE_STATES.RECOVERING)
    expect(container.textContent).toContain('Recovering')

    await click(viewButton('Strength'))
    expect(lastMap().load.quadriceps).toBeLessThan(1)
    expect(strengthRows()).toContain('Quads')

    await click(viewButton('Muscle balance'))
    expect(lastMap().load.chest).toBe(6)
    expectPressed(balanceRangeButton('30d'))
  })

  it('ignores an undone latest set, floors rendered training age, and follows production rankOf ordering', async () => {
    await mountStats()
    await click(viewButton('Strength'))

    const load = lastMap().load
    const expectedRows = rankOf(load).worked
      .filter(slug => load[slug] < 1)
      .map(slug => MUSCLE_NAME[slug])
    expect(strengthRows()).toEqual(expectedRows)

    // The newer abs row is undone, so the rendered hint uses the completed event from 20 days ago.
    expect(container.textContent).toContain('1 sets')

    // The production helper used by Stats' rendered strength hint floors six elapsed days to zero.
    expect(weeksSinceTraining(BASE_NOW, BASE_NOW - 6 * DAY)).toBe(0)
  })

  it('uses production boundaries and fixed absolute bands for all-fatigued and all-subfull maps', async () => {
    expect(fatigueStateOf(0.2499)).toBe(FATIGUE_STATES.READY)
    expect(fatigueStateOf(0.25)).toBe(FATIGUE_STATES.RECOVERING)
    expect(fatigueStateOf(0.5)).toBe(FATIGUE_STATES.RECOVERING)
    expect(fatigueStateOf(0.5001)).toBe(FATIGUE_STATES.FATIGUED)

    resetFixture([allFatiguedWorkout()])
    await mountStats()
    await click(viewButton('Fatigue'))
    const fatigueMap = lastMap()
    expect(Object.keys(fatigueMap.load)).toEqual(MUSCLES)
    expect(Object.values(fatigueMap.load).every(value => value > 0.5)).toBe(true)
    expect(Object.values(levelsOf(fatigueMap.load, fatigueMap.thresholds)).every(level => level === 4)).toBe(true)

    await unmountStats()
    resetFixture([allSubfullWorkout()])
    await mountStats()
    await click(viewButton('Strength'))
    const strengthMap = lastMap()
    expect(Object.values(strengthMap.load).every(value => value < 1)).toBe(true)
    expect(Math.min(...Object.values(strengthMap.load))).toBe(STRENGTH_FLOOR)
    expect(strengthMap.thresholds.at(-1)).toEqual({ at: 1, level: 4 })
  })
})
