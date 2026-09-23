// @vitest-environment happy-dom
// #284: "I forgot to check in, so it appears later in the history as a missed day." A planned day
// in the past with nothing logged offers to log it, from the week strip and the calendar (both
// open the day sheet), and what gets logged is built like any session of that plan.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { DEF, useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { dayOverrideSheet, logPastWorkoutSheet, finishWorkout } from './sheets.jsx'
import { markAllSetsDone } from './lib/backfill.js'
import { EXDB } from './lib/exercises-data.js'

const BENCH = '0025'
const ROW = EXDB.find(e => e.id !== BENCH && e.bp === 'back' && e.eq === 'barbell').id
const clone = v => JSON.parse(JSON.stringify(v))
const S = () => useStore.getState().S
const mounted = []

function mountTopSheet() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}
const button = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text)
// Mounted before the click's own act(): a render nested inside it lands only once it is over.
function tapInTopSheet(text) {
  const target = button(mountTopSheet(), text)
  expect(target, text).toBeTruthy()
  act(() => { target.click() })
}

function install(extra = {}) {
  const st = clone(DEF)
  Object.assign(st, {
    routines: [
      { id: 'A', name: 'Push', emoji: 'dumbbell', ex: [{ id: BENCH, sets: 2, reps: 10, weight: 50, mode: 'reps' }] },
      { id: 'B', name: 'Pull', emoji: 'dumbbell', ex: [{ id: ROW, sets: 3, reps: 8, weight: 40, mode: 'reps' }] },
    ],
    // Monday trains both routines as one session, Friday just the first.
    week: { 1: ['A', 'B'], 5: ['A'] }, dayPlan: {}, active: null, workouts: [], weighIn: false,
  }, extra)
  useStore.setState({ S: st, user: null })
}

beforeEach(() => {
  // Wednesday 16 September 2026, midday.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-16T12:00:00'))
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  useUI.setState({ sheets: [], toasts: [] })
  document.body.innerHTML = ''
  install()
})
afterEach(() => {
  act(() => { mounted.splice(0).forEach(root => root.unmount()) })
  vi.useRealTimers()
})

describe('logging a missed planned day', () => {
  it('is offered on a past planned day with nothing logged, and nowhere else', () => {
    const offered = iso => {
      useUI.setState({ sheets: [] })
      dayOverrideSheet(iso)
      return !!button(mountTopSheet(), 'Log this workout')
    }
    expect(offered('2026-09-14')).toBe(true)                 // Monday, missed
    expect(offered('2026-09-15')).toBe(false)                // Tuesday, a rest day
    expect(offered('2026-09-16')).toBe(false)                // today: that is still a Start
    expect(offered('2026-09-18')).toBe(false)                // Friday, still to come
    install({ workouts: [{ id: 'w', d: '2026-09-11', start: 1, end: 2, name: 'Push', entries: [], prs: [] }] })
    expect(offered('2026-09-11')).toBe(false)                // last Friday, logged
    install({ dayPlan: { '2026-09-14': 'rest' } })
    expect(offered('2026-09-14')).toBe(false)                // Monday moved to rest
  })

  it('opens "Log a past workout" on that day with the day\'s routines, as one session', () => {
    dayOverrideSheet('2026-09-14')
    tapInTopSheet('Log this workout')
    // the day sheet made way for the log sheet
    expect(useUI.getState().sheets).toHaveLength(1)
    const host = mountTopSheet()
    expect(host.querySelector('h3').textContent).toBe('Log a past workout')
    expect(host.querySelector('input[type=date]').value).toBe('2026-09-14')
    expect(host.textContent).toContain('Push + Pull')
    act(() => { button(host, 'Continue').click() })

    const A = S().active
    expect(A).toMatchObject({ d: '2026-09-14', name: 'Push + Pull', routineIds: ['A', 'B'], backfill: { durationMin: 60, replaceId: null } })
    // built the way a live session of that plan is: each entry stamped with its routine and plan
    expect(A.entries.map(e => [e.id, e.rid, e.planned?.sets, e.planned?.reps])).toEqual([[BENCH, 'A', 2, 10], [ROW, 'B', 3, 8]])
  })

  it('offers a single planned routine as the routine itself', () => {
    dayOverrideSheet('2026-09-11')
    tapInTopSheet('Log this workout')
    tapInTopSheet('Continue')
    expect(S().active).toMatchObject({ d: '2026-09-11', name: 'Push', routineIds: ['A'] })
  })

  it('files a completed workout on that date once its sets are marked done', () => {
    dayOverrideSheet('2026-09-14')
    tapInTopSheet('Log this workout')
    tapInTopSheet('Continue')
    act(() => { useStore.getState().update(s => { s.active.entries = markAllSetsDone(s.active.entries) }) })
    act(() => finishWorkout())
    expect(S().active).toBeNull()
    const [w] = S().workouts
    expect(w).toMatchObject({ d: '2026-09-14', routineIds: ['A', 'B'], prs: [] })
    expect(new Date(w.start).getHours()).toBe(18)
    expect(w.entries.map(e => [e.rid, e.sets.every(s => s.done)])).toEqual([['A', true], ['B', true]])
    expect(w.entries[0].planned).toMatchObject({ sets: 2, reps: 10 })
  })

  // Review of #284: Monday missed, the routine trained again on Tuesday, Monday logged on
  // Wednesday. Built from the whole log, Monday opened at the weight Tuesday had progressed to and
  // was saved with it, filed ahead of Tuesday: a spike on the chart and a best set dated a day early.
  it('builds a missed day from the sessions before it, not from one logged after it', () => {
    const pushed = (id, d, w) => ({
      id, d, start: new Date(d + 'T18:00:00').getTime(), end: new Date(d + 'T19:00:00').getTime(), name: 'Push',
      routineIds: ['A'], prs: [], entries: [{ id: BENCH, rid: 'A', target: { sets: 2, reps: 10, weight: w, mode: 'reps' },
        planned: { sets: 2, reps: 10, weight: 50 }, sets: [{ w, r: 10, done: true }, { w, r: 10, done: true }] }],
    })
    install({ workouts: [pushed('fri', '2026-09-11', 50), pushed('tue', '2026-09-15', 52.5)] })
    dayOverrideSheet('2026-09-14')
    tapInTopSheet('Log this workout')
    tapInTopSheet('Continue')
    const bench = S().active.entries.find(e => e.id === BENCH)
    expect(bench.sets.filter(s => s.phase !== 'warmup').map(s => s.w)).toEqual([52.5, 52.5])
    expect(bench.target.weight).toBe(52.5)
  })

  it('still refuses while a workout is running', () => {
    const toast = vi.fn()
    useUI.setState({ toast })
    install({ active: { id: 'live', entries: [] } })
    dayOverrideSheet('2026-09-14')
    tapInTopSheet('Log this workout')
    expect(toast).toHaveBeenCalledWith('Finish the current workout first.')
    expect(useUI.getState().sheets).toHaveLength(0)
  })

  it('treats a click event from the History button as no day at all', () => {
    logPastWorkoutSheet({ type: 'click', target: null })
    const host = mountTopSheet()
    expect(host.querySelector('input[type=date]').value).toBe('2026-09-15')
    expect(host.textContent).toContain('Freestyle')
  })
})
