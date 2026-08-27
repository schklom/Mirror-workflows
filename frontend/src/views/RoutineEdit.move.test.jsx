// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RoutineEdit from './RoutineEdit.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { _setLangState } from '../lib/i18n-core.js'
import de from '../locales/de.js'
import { buildPlanBundle, parsePlan } from '../lib/plan-share.js'

const mocks = vi.hoisted(() => ({ exConfigSheet: vi.fn() }))
vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})) }))
vi.mock('../sheets.jsx', () => ({
  glyphPicker: vi.fn(), exercisePicker: vi.fn(), exConfigSheet: mocks.exConfigSheet, confirmSheet: vi.fn()
}))
vi.mock('../components/Media.jsx', () => ({ Thumb: () => null }))
vi.mock('../components/BodyMap.jsx', () => ({ default: () => null }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = value => JSON.parse(JSON.stringify(value))
const custom = id => ({ id, n: id, bp: 'chest', eq: 'body weight', tg: 'chest', custom: true })
const entry = (id, setup, sg) => ({
  id, sets: 3, reps: 5, weight: setup, note: `setup-${setup}`,
  ...(sg ? { sg } : {})
})

let root
let container

function setRoutine(ex) {
  const S = clone(DEF)
  S.routines = [{ id: 'r1', name: 'Move test', emoji: 'dumbbell', ex }]
  S.customEx = ['c1', 'c2', 'c3', 'c4'].map(custom)
  useStore.setState({ S, user: null })
}

function renderRoutine() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(
    <MemoryRouter initialEntries={['/routine/r1']}>
      <Routes><Route path="/routine/:id" element={<RoutineEdit />} /></Routes>
    </MemoryRouter>
  ))
}

function itemFor(name) {
  return [...container.querySelectorAll('.item')].find(item => item.textContent.includes(name))
}

function moveButton(name, direction) {
  return itemFor(name).querySelector(`button[aria-label="${direction}"]`)
}

beforeEach(() => {
  localStorage.clear()
  mocks.exConfigSheet.mockClear()
  _setLangState('en', null, null, null)
  root = null
  container = null
})

afterEach(() => {
  if (root) act(() => root.unmount())
  if (container) container.remove()
  _setLangState('en', null, null, null)
})

describe('routine move controls', () => {
  it('moves a selected superset member as one contiguous unit and persists complete occurrences', () => {
    setRoutine([
      entry('c1', 10, 'g'),
      entry('c2', 20, 'g'),
      entry('c3', 30)
    ])
    renderRoutine()

    act(() => moveButton('setup-20', 'Move down').click())

    const moved = useStore.getState().S.routines[0].ex
    expect(moved).toEqual([
      entry('c3', 30),
      entry('c1', 10, 'g'),
      entry('c2', 20, 'g')
    ])
    expect(JSON.parse(localStorage.getItem('gym_state_v1')).routines[0].ex).toEqual(moved)
  })

  it('moves the selected duplicate occurrence without aliasing its configuration', () => {
    setRoutine([
      entry('c1', 10),
      entry('c2', 20),
      entry('c1', 30)
    ])
    renderRoutine()

    act(() => moveButton('setup-30', 'Move up').click())

    expect(useStore.getState().S.routines[0].ex).toEqual([
      entry('c1', 10),
      entry('c1', 30),
      entry('c2', 20)
    ])
  })

  it('disables unit-boundary directions without cleaning or persisting state', () => {
    setRoutine([
      entry('c1', 10, 'orphan'),
      entry('c2', 20)
    ])
    renderRoutine()
    const before = useStore.getState().S

    expect(moveButton('c1', 'Move up').disabled).toBe(true)
    expect(moveButton('c2', 'Move down').disabled).toBe(true)
    act(() => moveButton('c1', 'Move up').click())

    expect(useStore.getState().S).toBe(before)
    expect(useStore.getState().S.routines[0].ex[0].sg).toBe('orphan')
    expect(localStorage.getItem('gym_state_v1')).toBeNull()
  })

  it('uses localized accessible names and titles, retains button focus, and does not open config', () => {
    _setLangState('de', de, null, null)
    setRoutine([entry('c1', 10), entry('c2', 20)])
    renderRoutine()
    const button = moveButton('c2', 'Nach oben')

    expect(button.title).toBe('Nach oben')
    button.focus()
    act(() => button.click())

    expect(document.activeElement?.tagName).toBe('BUTTON')
    expect(mocks.exConfigSheet).not.toHaveBeenCalled()
  })

  it('retains reordered occurrence order and grouping through plan export and import', () => {
    setRoutine([
      entry('c1', 10, 'g'),
      entry('c2', 20, 'g'),
      entry('c3', 30)
    ])
    renderRoutine()
    act(() => moveButton('setup-10', 'Move down').click())

    const parsed = parsePlan(JSON.stringify(buildPlanBundle(useStore.getState().S, 'Move test')))
    expect(parsed.routines[0].ex).toEqual([
      entry('c3', 30),
      entry('c1', 10, 'g'),
      entry('c2', 20, 'g')
    ])
  })
})

describe('routine move-control locale coverage', () => {
  const packs = import.meta.glob('../locales/*.js', { eager: true, import: 'default' })

  it('defines both accessible names in all twelve locale packs', () => {
    expect(Object.keys(packs)).toHaveLength(12)
    Object.entries(packs).forEach(([path, pack]) => {
      expect(pack, `${path} is missing Move up`).toHaveProperty('Move up')
      expect(pack, `${path} is missing Move down`).toHaveProperty('Move down')
    })
  })
})
