// @vitest-environment happy-dom

/* QA, v1.3.9 (t8): "Reset everything" on one device was undone by the next device that pushed a
   change of its own — its push got the 409, the merge took the union, and the wiped profile was
   back. The reset now carries its time (`resetAt`) and a merge with a copy that has not seen it
   keeps only what that copy made after it (lib/sync-merge.js). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api.js', () => ({ api: vi.fn(), setRemoteAuth: vi.fn() }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast: vi.fn() }) } }))

import { api } from '../lib/api.js'
import { DEF, useStore } from './useStore.js'

const clone = v => JSON.parse(JSON.stringify(v))
const ids = xs => (xs || []).map(x => x.id)
const workout = (id, end) => ({ id, d: '2026-09-20', start: end - 1000, end, entries: [] })
const puts = () => api.mock.calls.filter(([, o]) => o?.method === 'PUT').map(([, o]) => JSON.parse(o.body))
const conflict = (state, rev) => Object.assign(new Error('conflict'), { status: 409, data: { state, rev } })
const signedIn = (S, rev) => {
  localStorage.setItem('gym_sync', JSON.stringify({ rev, ts: S._ts }))
  useStore.setState({ S, user: { id: 'u1' }, ready: true, sync: { offline: false, pending: false, lastSynced: 0 } })
}
const PROFILE = { ...clone(DEF), _ts: 100, workouts: [workout('w1', 50), workout('w2', 60)], routines: [{ id: 'r1', name: 'A', ex: [], _ts: 10 }], bodyweight: [{ d: '2026-09-01', w: 80, t: 10 }] }

beforeEach(() => { localStorage.clear(); api.mockReset() })
afterEach(() => { localStorage.clear(); useStore.setState({ S: clone(DEF), user: null, ready: false }) })

describe('Reset everything', () => {
  it('replaces the server copy with the empty one, stamped with when', async () => {
    signedIn(clone(PROFILE), 3)
    api.mockResolvedValueOnce({ ok: true, rev: 4 })
    const before = Date.now()
    useStore.getState().resetEverything()
    await useStore.getState().pushState()
    const [put] = puts()
    expect(put.baseRev).toBeUndefined()
    expect(put.state.workouts).toEqual([])
    expect(put.state.resetAt).toBeGreaterThanOrEqual(before)
  })

  it('a device that has not seen it and pushes a change from before keeps the reset, not the old profile', async () => {
    signedIn(clone(PROFILE), 3)
    useStore.getState().update(s => { s.restSec = 45 })   // a change made before the reset, unsent
    const resetAt = Date.now() + 1000
    const serverReset = { ...clone(DEF), _ts: resetAt, resetAt, _rev: 4 }
    api.mockRejectedValueOnce(conflict(serverReset, 4))
    api.mockResolvedValueOnce({ ok: true, rev: 5 })
    await useStore.getState().pushState()

    const put = puts().at(-1)
    expect(put.baseRev).toBe(4)
    expect(put.state.workouts).toEqual([])
    expect(put.state.routines).toEqual([])
    expect(put.state.bodyweight).toEqual([])
    expect(put.state.resetAt).toBe(resetAt)
    expect(useStore.getState().S.workouts).toEqual([])
  })

  it('what that device logged after the reset is kept', async () => {
    const resetAt = Date.now() - 60000
    signedIn(clone(PROFILE), 3)
    useStore.getState().update(s => { s.workouts.push(workout('after', Date.now())) })
    const serverReset = { ...clone(DEF), _ts: resetAt, resetAt, _rev: 4 }
    api.mockRejectedValueOnce(conflict(serverReset, 4))
    api.mockResolvedValueOnce({ ok: true, rev: 5 })
    await useStore.getState().pushState()
    expect(ids(puts().at(-1).state.workouts)).toEqual(['after'])
  })
})
