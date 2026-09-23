// @vitest-environment happy-dom
// PR #286 put the routine rows inside SwipeToDelete. The rows used to be tappable() — a button to
// the keyboard, opened with Enter or Space — and the swipe must not take that away, nor leave a
// delete button in the tab order that nobody can see.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../store/useStore.js'
import Plan from './Plan.jsx'

const nav = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))
vi.mock('../sheets.jsx', () => ({
  dayAssignSheet: vi.fn(), dayAddRoutineSheet: vi.fn(), starterPlanSheet: vi.fn(), planToolsSheet: vi.fn(),
  // Say yes straight away: the sheet itself is not what is under test.
  confirmSheet: ({ onConfirm }) => onConfirm(),
}))

const routine = (id, name) => ({ id, name, emoji: null, ex: [{ id: '0025' }] })
let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  nav.mockClear()
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  useStore.setState(s => ({ S: { ...s.S,
    routines: [routine('a', 'Push A'), routine('b', 'Pull A')],
    week: { 1: ['a', 'b'], 3: ['b'] }, dayPlan: { '2099-01-01': 'b' } }, user: null }))
  act(() => root.render(<Plan />))
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const row = name => [...host.querySelectorAll('.item[role="button"]')].find(e => e.querySelector('.tt')?.textContent === name)
const del = name => row(name).parentElement.querySelector('button.swipe-del')

describe('routine rows after swipe-to-delete', () => {
  it('stay a keyboard button that opens the routine on Enter and on Space', () => {
    const r = row('Pull A')
    expect(r.tabIndex).toBe(0)
    act(() => { r.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    expect(nav).toHaveBeenLastCalledWith('/plan/r/b')
    act(() => { row('Push A').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })) })
    expect(nav).toHaveBeenLastCalledWith('/plan/r/a')
  })

  it('still open the routine on a plain click', () => {
    act(() => { row('Push A').dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(nav).toHaveBeenLastCalledWith('/plan/r/a')
  })

  it('slide open while the delete button has focus, and close when focus moves on', () => {
    const r = row('Push A')
    act(() => { del('Push A').focus() })
    expect(r.style.transform).toBe('translateX(-76px)')
    act(() => { r.focus() })
    expect(r.style.transform).toBe('translateX(0px)')
  })

  it('delete through the shared helper: the routine, its days and its reschedules', () => {
    act(() => { del('Pull A').dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    const S = useStore.getState().S
    expect(S.routines.map(r => r.id)).toEqual(['a'])
    expect(S.week).toEqual({ 1: ['a'] })
    expect(S.dayPlan).toEqual({})
    expect(nav).not.toHaveBeenCalled()
  })
})
