// @vitest-environment happy-dom
// Closing the editor of a saved workout: a save prompt still open after the editor already
// closed (a route exit racing the first Save) must not offer to delete the workout it saved.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { exitWorkoutEdit, saveWorkoutEdits } from './sheets.jsx'
import { setNav } from './lib/nav.js'
import { EXDB } from './lib/exercises.js'
import { editCompletedSession } from './lib/session-edit.js'

const mounted = []
const [A] = EXDB.filter(e => e.bp !== 'cardio').slice(0, 1).map(e => e.id)
const saved = () => ({
  id: 'w-old', d: '2026-09-10', start: 1, end: 2, name: 'Push', prs: [],
  entries: [{ id: A, target: { mode: 'reps', reps: 8 }, sets: [{ w: 45, r: 8, done: true }] }],
})

function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}
const button = (host, label) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label)

describe('closing the saved-workout editor', () => {
  let navigated
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    navigated = []
    setNav(to => { navigated.push(to) })
    useUI.setState({ sheets: [], toastMsg: '' })
    useStore.setState(s => ({ S: { ...s.S, workouts: [saved()], routines: [], active: null } }))
    useStore.getState().update(S => { editCompletedSession(S, 'w-old'); S.active.entries[0].sets[0].w = 50 })
    document.body.innerHTML = ''
  })
  afterEach(() => { act(() => { mounted.splice(0).forEach(root => root.unmount()) }) })

  it('a second, stale save prompt only leaves: no delete offer, no false toast', () => {
    exitWorkoutEdit()
    exitWorkoutEdit()   // the route-exit prompt that raced the first one
    expect(useUI.getState().sheets.length).toBe(2)
    const second = renderTop()
    const first = useUI.getState().sheets[0]
    act(() => { useUI.getState().closeSheet(useUI.getState().sheets.at(-1).id) })
    // Save on the first prompt saves and closes the editor.
    const host = document.createElement('div'); document.body.appendChild(host)
    const root = createRoot(host); mounted.push(root)
    act(() => root.render(first.render(() => useUI.getState().closeSheet(first.id))))
    act(() => { button(host, 'Save changes').click() })
    expect(useStore.getState().S.active).toBeNull()
    expect(useStore.getState().S.workouts[0].entries[0].sets[0].w).toBe(50)
    expect(useUI.getState().toastMsg).toBe('Workout updated')
    // The stale one's Save now just finishes leaving.
    act(() => { button(second, 'Save changes').click() })
    expect(useUI.getState().sheets.length).toBe(0)
    expect(useUI.getState().toastMsg).toBe('Workout updated')
    expect(useStore.getState().S.workouts).toHaveLength(1)
    expect(navigated).toEqual(['/history', '/history'])
  })

  it('with no editor open, closing and saving open nothing', () => {
    useStore.getState().discardHistoryEdit()
    exitWorkoutEdit()
    saveWorkoutEdits()
    expect(useUI.getState().sheets.length).toBe(0)
    expect(navigated).toEqual(['/history', '/history'])
  })
})
