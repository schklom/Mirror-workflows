// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import StructuralBalance from './StructuralBalance.jsx'

const navSpy = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navSpy }))

const clone = value => JSON.parse(JSON.stringify(value))
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mounted = []
function render() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(<StructuralBalance />))
  return host
}

function setDoneSet(w, r) { return { done: true, w, r } }
function workoutAt(id, start, sets) {
  return { d: new Date(start).toISOString(), start, entries: [{ id, sets }] }
}

beforeEach(() => {
  navSpy.mockClear()
  localStorage.clear()
  useUI.setState({ sheets: [] })
  const S = clone(DEF)
  S.workouts = [workoutAt('0030', Date.now(), [setDoneSet(100, 1)])] // narrowBench anchor logged
  useStore.setState({ S, user: null })
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => { mounted.splice(0).forEach(root => root.unmount()) })
})

describe('StructuralBalance view', () => {
  it('renders every role of the default (Poliquin) template', () => {
    const host = render()
    const rows = host.querySelectorAll('[data-role-id]')
    expect(rows.length).toBe(9)
    expect(host.querySelector('[data-role-id="narrowBench"]').textContent).toContain('Balanced')
    expect(host.querySelector('[data-role-id="deadlift"]').textContent).toContain('No data')
  })

  it('switching templates via the Segmented control recomputes the role list', () => {
    const host = render()
    const atgButton = [...host.querySelectorAll('.seg button')].find(b => b.textContent === 'ATG')
    expect(atgButton).toBeTruthy()
    act(() => atgButton.click())

    expect(useStore.getState().S.balanceTemplate).toBe('atg')
    const rows = host.querySelectorAll('[data-role-id]')
    expect(rows.length).toBe(8)
    expect(host.querySelector('[data-role-id="nordicCurl"]')).toBeTruthy()
  })

  it('a role with no matching exercise ever logged shows "No data" without throwing', () => {
    const host = render()
    const deadlift = host.querySelector('[data-role-id="deadlift"]')
    expect(deadlift.textContent).toContain('No data')
  })

  it('the back chevron navigates to /stats', () => {
    const host = render()
    act(() => host.querySelector('.iconbtn').click())
    expect(navSpy).toHaveBeenCalledWith('/stats')
  })

  it('changing a role\'s exercise via the picker saves an override and marks it custom', () => {
    const host = render()
    const row = host.querySelector('[data-role-id="inclineBench"]')
    const changeBtn = [...row.querySelectorAll('button')].find(b => b.textContent.includes('Change exercise'))
    act(() => changeBtn.click())

    const picker = useUI.getState().sheets.at(-1)
    expect(picker).toBeTruthy()
    const pickerView = picker.render(picker.close)
    act(() => pickerView.props.onPick({ id: '0043' })) // barbell full squat — deliberately not in inclineBench's whitelist

    expect(useStore.getState().S.balanceOverrides['poliquin:inclineBench']).toBe('0043')

    const updatedRow = host.querySelector('[data-role-id="inclineBench"]')
    expect(updatedRow.textContent).toContain('Custom')

    const resetBtn = [...updatedRow.querySelectorAll('button')].find(b => b.textContent.includes('Use default exercise'))
    expect(resetBtn).toBeTruthy()
    act(() => resetBtn.click())
    expect(useStore.getState().S.balanceOverrides['poliquin:inclineBench']).toBeUndefined()
  })
})
