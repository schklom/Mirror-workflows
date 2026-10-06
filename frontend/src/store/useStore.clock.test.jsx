// @vitest-environment happy-dom

/* A device whose clock runs behind: every change it makes is stamped after the stamps of the copy
   it was made on (lib/sync-merge.js stampChange), so it wins over what it had already seen. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api.js', () => ({ api: vi.fn(), setRemoteAuth: vi.fn() }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast: vi.fn() }) } }))

import { DEF, useStore } from './useStore.js'

const clone = v => JSON.parse(JSON.stringify(v))
const AHEAD = Date.now() + 86400000   // stamps written by a device a day ahead

beforeEach(() => { localStorage.clear(); useStore.setState({ user: null, ready: true }) })
afterEach(() => { localStorage.clear() })

describe('update stamps after what the copy has seen', () => {
  it('settings, routines, workouts and removals all come after the newest stamp', () => {
    const S = { ...clone(DEF), _ts: AHEAD, restSec: 90, edited: { restSec: AHEAD },
      routines: [{ id: 'r1', name: 'A', ex: [], _ts: AHEAD }],
      workouts: [{ id: 'w1', d: '2026-10-06', start: 1, end: 2, entries: [], _ts: AHEAD }, { id: 'w2', d: '2026-10-06', start: 3, end: 4, entries: [] }] }
    useStore.setState({ S })
    useStore.getState().update(s => {
      s.restSec = 60
      s.routines[0].name = 'B'
      s.workouts[0].note = 'n'; s.workouts[0]._ts = Date.now()
      s.workouts = s.workouts.filter(w => w.id !== 'w2')
    })
    const n = useStore.getState().S
    expect(n.edited.restSec).toBeGreaterThan(AHEAD)
    expect(n.routines[0]._ts).toBeGreaterThan(AHEAD)
    expect(n.workouts[0]._ts).toBeGreaterThan(AHEAD)
    expect(n.deleted.workouts.w2).toBeGreaterThan(AHEAD)
    expect(n._ts).toBeGreaterThan(AHEAD)
  })
})
