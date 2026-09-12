// @vitest-environment happy-dom
// Plan's rotation editor: one row per sequence position, add/remove/move writing straight through
// lib/rotation.js, adoption of an externally written queue, recovery for a malformed one, and the
// weekday grid staying up alongside the editor for any live queue — hidden only with Rotation
// chosen and nothing built yet, or a saved sequence whose routines are all gone.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({
    S: state.S,
    update: mut => { const next = structuredClone(state.S); mut(next); state.S = next },
    config: {}, user: null, coachLocal: { mode: 'off' },
  })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../sheets.jsx', () => ({
  dayAssignSheet: vi.fn(), dayAddRoutineSheet: vi.fn(), starterPlanSheet: vi.fn(),
  planToolsSheet: vi.fn(), menuSheet: vi.fn(), confirmSheet: vi.fn(),
}))
vi.mock('../lib/mobile.js', () => ({ MOBILE: false }))
vi.mock('../lib/demo.js', () => ({ DEMO: false }))
vi.mock('../lib/coach.js', () => ({ coachAvailable: () => false }))

import Plan from './Plan.jsx'
import { menuSheet, confirmSheet } from '../sheets.jsx'
import { todayISO } from '../lib/format.js'

const routines = [
  { id: 'a', name: 'A', emoji: null, ex: [{ id: '0025' }] },
  { id: 'b', name: 'B', emoji: null, ex: [{ id: '0025' }] },
  { id: 'c', name: 'C', emoji: null, ex: [{ id: '0025' }] },
]
const live = (over = {}) => ({ ids: ['a', 'b'], since: Date.now() - 86400000, startsOn: todayISO(), label: 'My split', ...over })
const baseS = over => ({ routines, week: { 1: ['c'] }, dayPlan: {}, workouts: [], queue: null, rotation: null, scheduleMode: null, ...over })

let host, root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); menuSheet.mockClear(); confirmSheet.mockClear() })
afterEach(() => { act(() => root.unmount()); host.remove() })

const mount = over => { mocks.S = baseS(over); act(() => root.render(<Plan />)) }
const rows = () => [...host.querySelectorAll('.rotation-row')]
const names = () => rows().map(r => r.querySelector('.tt').textContent)
const click = el => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const byLabel = label => [...host.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === label || b.textContent.trim() === label)

describe('Plan — the rotation editor', () => {
  it('lists the live pass in order, and keeps the weekday grid up for a managed pass too', () => {
    // A managed pass no longer hides the grid: the weekday routines still ride alongside it
    // (effectiveRoutineIds, history.js) and feed the same tally (weekTally, queue.js), so hiding
    // the grid would hide the very thing a combined count depends on.
    mount({ queue: live({ rotationId: 'r1' }), rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' } })
    expect(names()).toEqual(['A', 'B'])
    expect(host.textContent).toContain('Week schedule')
    expect(host.textContent).toContain('C')   // week[1] = ['c'] (baseS) rides along beside the pass
  })

  it('a coach queue with S.scheduleMode stuck on "rotation" still shows Week schedule, never Build a rotation instead', () => {
    // scheduleMode is stale/irrelevant once a queue is live — it only matters with no queue at
    // all (the from-scratch setup gap hideGrid exists for).
    mount({ queue: live(), scheduleMode: 'rotation' })   // external queue; no S.rotation
    expect(host.textContent).toContain('Week schedule')
    expect(byLabel('Build a rotation instead')).toBeUndefined()
  })

  it('nothing saved shows the weekday grid, with a button into the rotation editor', () => {
    mount()
    expect(host.textContent).toContain('Week schedule')
    expect(rows()).toEqual([])
    click(byLabel('Build a rotation instead'))
    expect(mocks.S.scheduleMode).toBe('rotation')
    // the mocked store is not reactive, so re-mount to see the persisted choice render
    mount({ scheduleMode: mocks.S.scheduleMode })
    expect(host.textContent).toContain('Rotation')
    expect(host.textContent).not.toContain('Week schedule')
  })

  it('Cancel gives the schedule back to the weekday plan', () => {
    mount({ scheduleMode: 'rotation' })
    expect(host.textContent).toContain('Rotation')
    click(byLabel('Cancel'))
    expect(mocks.S.scheduleMode).toBe('week')
    mount({ scheduleMode: mocks.S.scheduleMode })
    expect(host.textContent).toContain('Week schedule')
    expect(host.textContent).not.toContain('Rotation')
  })

  it('adding a routine offers only the ones not in the sequence, and saves the pass', () => {
    mount({ queue: live({ rotationId: 'r1' }), rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' } })
    click(byLabel('Add routine to the rotation'))
    const items = menuSheet.mock.calls[0][0].items
    expect(items.map(i => i.label)).toEqual(['C'])
    act(() => items[0].onClick())
    expect(mocks.S.queue.ids).toEqual(['a', 'b', 'c'])
    expect(mocks.S.rotation.sequence).toEqual(['a', 'b', 'c'])
  })

  it('move down reorders without restarting the pass', () => {
    const since = Date.now() - 86400000
    mount({ queue: live({ since, rotationId: 'r1' }), rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' } })
    click(rows()[0].querySelector('[aria-label="Move down"]'))
    expect(mocks.S.queue.ids).toEqual(['b', 'a'])
    expect(mocks.S.queue.since).toBe(since)
  })

  it('removing the last routine hands the schedule back to the weekday plan', () => {
    mount({ queue: live({ ids: ['a'], rotationId: 'r1' }), rotation: { id: 'r1', sequence: ['a'], label: 'My split' } })
    click(rows()[0].querySelector('[aria-label="Remove"]'))
    expect(mocks.S.queue).toBe(null)
    expect(mocks.S.rotation).toBe(null)
    expect(mocks.S.scheduleMode).toBe('week')
    expect(mocks.S.week).toEqual({ 1: ['c'] })
  })

  it('an externally written pass says so, keeps the weekday grid, and can be adopted behind a confirm', () => {
    mount({ queue: live() })                       // no rotationId, no rotation
    expect(host.textContent).toContain('Externally managed')
    expect(host.textContent).toContain('Week schedule')
    click(byLabel('Use this rotation'))
    expect(mocks.S.rotation).toBe(null)            // not adopted yet — waiting on the confirm
    act(() => confirmSheet.mock.calls.at(-1)[0].onConfirm())
    expect(mocks.S.rotation.sequence).toEqual(['a', 'b'])
    expect(mocks.S.queue.rotationId).toBe(mocks.S.rotation.id)
    // Adopting takes a name of its own rather than the planner's ("My split") — refillAfter would
    // otherwise repeat that name on every pass this app generates on its own from here on.
    expect(mocks.S.rotation.label).toBe('Rotation')
    expect(mocks.S.queue.label).toBe('Rotation')
    // (the mocked store is not reactive, so re-mount to see the adopted pass render)
    mount({ queue: live({ rotationId: mocks.S.rotation.id }), rotation: mocks.S.rotation })
    expect(host.textContent).not.toContain('Externally managed')
    expect(host.textContent).toContain('Week schedule')
  })

  it('an external queue keeps its rows read-only — no button but the adoption one writes rotationId', () => {
    mount({ queue: live() })                       // no rotationId, no rotation in state
    expect(host.textContent).toContain('Externally managed')
    expect(host.textContent).toContain('Week schedule')
    expect(rows()[0].querySelectorAll('button').length).toBe(0)   // read-only: no per-row buttons at all
    expect(byLabel('Add routine to the rotation')).toBeUndefined()
    expect(byLabel('Move up')).toBeUndefined()
    expect(byLabel('Move down')).toBeUndefined()
    expect(mocks.S.queue.rotationId).toBeUndefined()
    click(byLabel('Use this rotation'))
    act(() => confirmSheet.mock.calls.at(-1)[0].onConfirm())
    expect(mocks.S.queue.rotationId).toBe(mocks.S.rotation.id)
  })

  it('Start new pass rewinds the current one', () => {
    mount({
      queue: live({ since: Date.now() - 5 * 86400000, startsOn: '2026-09-01', rotationId: 'r1' }),
      rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' },
    })
    click(byLabel('Start new pass'))
    expect(mocks.S.queue.startsOn).toBe(todayISO())
    expect(mocks.S.queue.ids).toEqual(['a', 'b'])
  })

  it('a malformed queue offers recovery instead of an editor full of nothing', () => {
    mount({ queue: { ids: ['gone'], since: Date.now() } })
    expect(host.textContent).toContain('This rotation could not be read')
    click(byLabel('Discard it'))
    expect(mocks.S.queue).toBe(null)
  })

  it('Discard it leaves a clear way back in, not a hidden grid with a saved sequence stuck behind it', () => {
    // A saved sequence survives the corrupt queue — without also giving up scheduleMode, that
    // combination (no queue, scheduleMode still 'rotation') keeps hideGrid true and the grid's
    // own "Start pass" — the way out — hidden right along with it.
    mount({ queue: { ids: ['gone'], since: Date.now() }, rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' } })
    click(byLabel('Discard it'))
    expect(mocks.S.queue).toBe(null)
    expect(mocks.S.scheduleMode).toBe('week')
    // (the mocked store is not reactive, so re-mount to see the discarded state render)
    mount({ scheduleMode: mocks.S.scheduleMode, rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' } })
    expect(host.textContent).toContain('Week schedule')
    expect(byLabel('Start pass')).toBeDefined()
    click(byLabel('Start pass'))
    expect(mocks.S.queue.ids).toEqual(['a', 'b'])
  })

  it('a saved sequence with no live pass offers Start pass, not Build a rotation instead', () => {
    // The state "Discard it" or Settings' "Use Fixed Week" leave behind: a saved rotation, no queue.
    mount({ rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' } })
    expect(host.textContent).toContain('Week schedule')
    expect(byLabel('Build a rotation instead')).toBeUndefined()
    click(byLabel('Start pass'))
    expect(mocks.S.queue.ids).toEqual(['a', 'b'])
    expect(mocks.S.queue.rotationId).toBe('r1')
  })

  it('every routine in the rotation getting deleted still leaves a way back in, not a locked editor', () => {
    // Deleting every routine from the Routines list (elsewhere in the app) leaves S.queue and
    // S.rotation referencing ids that exist nowhere in S.routines any more — queueOf reads that
    // as no queue at all (queueRecovery), while S.scheduleMode is still 'rotation' from before.
    mount({
      routines: [],   // every routine gone
      queue: { ids: ['a', 'b'], since: Date.now() },
      rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' },
      scheduleMode: 'rotation',
    })
    // Recovery no longer hides the grid — this is a fix-up, not the from-scratch setup gap.
    expect(host.textContent).toContain('This rotation could not be read')
    expect(host.textContent).toContain('Week schedule')
    click(byLabel('Discard it'))
    expect(mocks.S.queue).toBe(null)
    expect(mocks.S.scheduleMode).toBe('week')
    // (the mocked store is not reactive, so re-mount to see the discarded state render)
    mount({ routines: [], scheduleMode: mocks.S.scheduleMode, rotation: { id: 'r1', sequence: ['a', 'b'], label: 'My split' } })
    expect(host.textContent).toContain('Week schedule')
    // No routine in the saved sequence survives — "Start pass" would start nothing, so the offer
    // is a fresh build instead, not gated on `!S.rotation` alone (that object is still there).
    expect(byLabel('Start pass')).toBeUndefined()
    expect(byLabel('Build a rotation instead')).toBeDefined()
  })
})
