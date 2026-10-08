import { describe, expect, it } from 'vitest'
import { EXDB, EXIDX } from './exercises.js'
import V13_IDS from './catalogue-v13-ids.json' with { type: 'json' }

// Workouts, routines, records and backups store exercise ids, so an id that ever shipped must
// resolve forever (catalogue/README.md). This is every id of the v1.3 dataset, frozen.
describe('catalogue continuity', () => {
  it('still knows every exercise id openGym shipped before v1.4.0', () => {
    expect(V13_IDS).toHaveLength(1324)
    const gone = V13_IDS.filter(id => !EXIDX[id])
    expect(gone).toEqual([])
  })

  it('never lists one id twice', () => {
    expect(new Set(EXDB.map(e => e.id)).size).toBe(EXDB.length)
  })

  it('points every female drawing at an id that is not an exercise of its own', () => {
    for (const e of EXDB) if (e.fv) expect(EXIDX[e.fv], e.id).toBeUndefined()
  })
})
