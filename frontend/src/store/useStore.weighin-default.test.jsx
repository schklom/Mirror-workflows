// @vitest-environment happy-dom
// v1.3.11: "Weigh in before workouts" starts off for a profile created from nothing. A profile
// that already exists keeps what it had: one saved with the switch on stays on, and one saved
// before the setting existed (no key) still reads as on through DEF and `!== false`.
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api.js', () => ({ api: vi.fn() }))
vi.mock('./useUI.js', () => ({ useUI: { getState: () => ({ toast: vi.fn() }) } }))

import { freshState, DEF, restoredStateFor } from './useStore.js'

describe('weigh-in default', () => {
  it('a fresh profile starts with the weigh-in off', () => {
    expect(freshState().weighIn).toBe(false)
  })

  it('DEF keeps it on, so an existing profile without the key is not changed under it', () => {
    expect(DEF.weighIn).toBe(true)
    const old = { workouts: [{ id: 'w1' }], routines: [] }         // written before the setting existed
    const S = restoredStateFor({ workouts: [], routines: [], bodyweight: [], customEx: [] }, old)
    expect(S.weighIn).toBe(true)
    const off = restoredStateFor({ workouts: [], routines: [], bodyweight: [], customEx: [] }, { ...old, weighIn: false })
    expect(off.weighIn).toBe(false)
  })
})

describe('exercise animations default', () => {
  it('a fresh profile starts with Small animations, the thumbnail on the workout screen', () => {
    expect(freshState().gifSize).toBe('mini')
  })

  it('DEF keeps Full, so an existing profile without the key is not changed under it', () => {
    expect(DEF.gifSize).toBe('full')
    const S = restoredStateFor({ workouts: [], routines: [], bodyweight: [], customEx: [] }, { workouts: [{ id: 'w1' }], routines: [] })
    expect(S.gifSize).toBe('full')
  })
})
