// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout, { removeActiveExercise } from './Workout.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'

vi.mock('../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn() }))
vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})) }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = value => JSON.parse(JSON.stringify(value))
const entry = (id, sg) => ({
  id,
  ...(sg ? { sg } : {}),
  target: { sets: 1, reps: 1 },
  sets: [{ w: 0, r: 1, done: false }]
})

let root
let container

function setActive(entries, cur = 0) {
  const S = clone(DEF)
  S.active = {
    id: 'remove-test', d: '2026-08-11', start: Date.now(), routineId: null,
    name: 'Remove test', bw: null, cur, entries
  }
  useStore.setState({ S, user: null })
}

function renderWorkout(entries) {
  setActive(entries)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><Workout /></MemoryRouter>))
}

function removeButton() {
  return [...container.querySelectorAll('button')].find(button => button.textContent.includes('Remove exercise'))
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  useUI.getState().stopRest()
  useUI.getState().stopWork()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
  useStore.setState({ S: clone(DEF), user: null })
  root = null
  container = null
})

afterEach(() => {
  if (root) act(() => root.unmount())
  if (container) container.remove()
  useUI.getState().stopRest()
  useUI.getState().stopWork()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('active-session exercise removal', () => {
  it('disables removal for the whole duration of a timed hold', () => {
    renderWorkout([entry('1001')])
    expect(removeButton()).toBeTruthy()
    expect(removeButton().disabled).toBe(false)

    act(() => useUI.getState().startWork(30, 'Hold', vi.fn()))

    expect(removeButton().disabled).toBe(true)
  })

  it('cancels a pending timed callback before indexes shift and cleans a one-member group', () => {
    setActive([entry('1001', 'sg-1'), entry('1002', 'sg-1'), entry('1003')], 1)
    expect(useStore.getState().S.active.cur).toBe(1)
    const wrongWrite = vi.fn(elapsed => {
      useStore.getState().update(s => { s.active.entries[0].sets[0].sec = elapsed })
    })
    useUI.getState().startWork(5, 'Hold', wrongWrite)

    removeActiveExercise(0)
    vi.advanceTimersByTime(10_000)

    const active = useStore.getState().S.active
    expect(useUI.getState().work).toBeNull()
    expect(wrongWrite).not.toHaveBeenCalled()
    expect(active.entries.map(e => e.id)).toEqual(['1002', '1003'])
    expect(active.cur).toBe(0)
    expect(active.entries[0].sg).toBeUndefined()
    expect(active.entries[0].sets[0].sec).toBeUndefined()
  })

  it('hides the remove control for an empty freestyle session', () => {
    renderWorkout([])
    expect(removeButton()).toBeUndefined()
  })
})

describe('remove-exercise locale coverage', () => {
  const required = [
    'Remove {0}?',
    'The sets you logged for this exercise in this session will be lost.',
    'This removes the exercise from your current session.',
    'Remove',
    'Which exercise in this superset do you want to remove?'
  ]
  const packs = import.meta.glob('../locales/*.js', { eager: true, import: 'default' })

  it('defines every new prompt in all eleven locale packs', () => {
    expect(Object.keys(packs)).toHaveLength(11)
    Object.entries(packs).forEach(([path, pack]) => {
      required.forEach(key => expect(pack, `${path} is missing ${key}`).toHaveProperty(key))
    })
  })
})

describe('remove-exercise edge cases', () => {
  it('removing the last remaining exercise leaves an empty, coherent session', () => {
    setActive([entry('a')], 0)
    act(() => { removeActiveExercise(0) })
    const A = useStore.getState().S.active
    expect(A.entries).toHaveLength(0)
    expect(A.cur).toBe(0)
  })

  it('removing one half of a two-member superset dissolves the group', () => {
    setActive([entry('a', 'g1'), entry('b', 'g1'), entry('c')], 0)
    act(() => { removeActiveExercise(1) })
    const A = useStore.getState().S.active
    expect(A.entries.map(e => e.id)).toEqual(['a', 'c'])
    // A superset of one is not a superset.
    expect(A.entries[0].sg).toBeUndefined()
  })

  it('removing an entry below the active one keeps cur on the same exercise', () => {
    setActive([entry('a'), entry('b'), entry('c')], 2)
    act(() => { removeActiveExercise(0) })
    const A = useStore.getState().S.active
    expect(A.entries.map(e => e.id)).toEqual(['b', 'c'])
    expect(A.entries[A.cur].id).toBe('c')
  })
})
