import { describe, expect, it } from 'vitest'
import { localExtras, mergeBodyweight, mergeStates, newerOf, stampRoutines, unionById } from './sync-merge.js'
import { retimeWorkout } from './workout-date.js'

const workout = (id, d = '2026-09-01', start = 1) => ({ id, d, start, entries: [] })
const routine = (id, name = id) => ({ id, name, ex: [] })
const base = (over = {}) => ({
  unit: 'kg', restSec: 90, lang: 'en', week: { 1: ['r1'] }, dayPlan: {},
  workouts: [], routines: [], bodyweight: [], customEx: [], favEx: [], exWeights: {}, exNotes: {}, barWeights: {},
  equipProfiles: [], gymCards: [], _ts: 0, ...over
})
const ids = xs => (xs || []).map(x => x.id)

describe('newerOf / unionById / mergeBodyweight', () => {
  it('picks the later _ts, first argument on a tie or missing stamps', () => {
    const a = { _ts: 5 }, b = { _ts: 9 }
    expect(newerOf(a, b)).toBe(b)
    expect(newerOf(b, a)).toBe(b)
    expect(newerOf({ _ts: 5 }, { _ts: 5 })).toEqual({ _ts: 5 })
    expect(newerOf({}, { })).toEqual({})
  })
  it('unions by id in the newer order, newer wins a shared id, dupes dropped', () => {
    const out = unionById([routine('a', 'A2'), routine('b'), routine('b')], [routine('c'), routine('a', 'A1')])
    expect(ids(out)).toEqual(['a', 'b', 'c'])
    expect(out[0].name).toBe('A2')
    expect(unionById(undefined, null)).toEqual([])
  })
  it('bodyweight: one entry per day, the later-edited one, sorted', () => {
    const out = mergeBodyweight([{ d: '2026-09-02', w: 80, t: 5 }], [{ d: '2026-09-01', w: 81, t: 1 }, { d: '2026-09-02', w: 79, t: 9 }])
    expect(out).toEqual([{ d: '2026-09-01', w: 81, t: 1 }, { d: '2026-09-02', w: 79, t: 9 }])
  })
})

describe('mergeStates', () => {
  const A = () => base({
    _ts: 200, restSec: 120, week: { 1: ['rA'] },
    workouts: [workout('w1'), workout('wA', '2026-09-03')],
    routines: [routine('shared', 'from A'), routine('onlyA')],
    bodyweight: [{ d: '2026-09-01', w: 80, t: 10 }],
    customEx: [{ id: 'cA', name: 'A ex' }], favEx: ['x', 'y'],
    exWeights: { sq: { w: 100 }, bp: { w: 60 } }, exNotes: { sq: 'A note' }, barWeights: { sq: 20 },
    gymCards: [{ id: 'g1', value: '1' }], _rev: 7
  })
  const B = () => base({
    _ts: 100, restSec: 60, week: { 1: ['rB'] },
    workouts: [workout('w1'), workout('wB', '2026-09-02')],
    routines: [routine('shared', 'from B'), routine('onlyB')],
    bodyweight: [{ d: '2026-09-01', w: 79, t: 20 }, { d: '2026-08-30', w: 82, t: 1 }],
    customEx: [{ id: 'cB', name: 'B ex' }], favEx: ['y', 'z'],
    exWeights: { sq: { w: 110 }, dl: { w: 140 } }, exNotes: { dl: 'B note' }, barWeights: { dl: 15 },
    gymCards: [{ id: 'g2', value: '2' }], _rev: 8
  })

  it('no entity of either side disappears, ids stay unique', () => {
    const m = mergeStates(A(), B())
    expect(ids(m.workouts).sort()).toEqual(['w1', 'wA', 'wB'])
    expect(ids(m.routines).sort()).toEqual(['onlyA', 'onlyB', 'shared'])
    expect(ids(m.customEx).sort()).toEqual(['cA', 'cB'])
    expect(ids(m.gymCards).sort()).toEqual(['g1', 'g2'])
    expect(m.bodyweight.map(b => b.d)).toEqual(['2026-08-30', '2026-09-01'])
    expect(m.favEx).toEqual(['x', 'y', 'z'])
    expect(new Set(ids(m.workouts)).size).toBe(m.workouts.length)
  })

  it('the newer copy decides settings, week, and a shared id; the other way round too', () => {
    const m = mergeStates(A(), B())
    expect(m.restSec).toBe(120)
    expect(m.week).toEqual({ 1: ['rA'] })
    expect(m.routines.find(r => r.id === 'shared').name).toBe('from A')
    const m2 = mergeStates(B(), { ...A(), _ts: 50 })
    expect(m2.restSec).toBe(60)
    expect(m2.week).toEqual({ 1: ['rB'] })
    expect(m2.routines.find(r => r.id === 'shared').name).toBe('from B')
  })

  it('bodyweight keeps the later-edited entry of a day, exWeights the larger weight, notes union', () => {
    const m = mergeStates(A(), B())
    expect(m.bodyweight.find(b => b.d === '2026-09-01')).toEqual({ d: '2026-09-01', w: 79, t: 20 })
    expect(m.exWeights).toEqual({ sq: { w: 110 }, bp: { w: 60 }, dl: { w: 140 } })
    expect(m.exNotes).toEqual({ sq: 'A note', dl: 'B note' })
    expect(m.barWeights).toEqual({ sq: 20, dl: 15 })
  })

  it('is commutative on the union fields and idempotent', () => {
    const ab = mergeStates(A(), B()), ba = mergeStates(B(), A())
    for (const f of ['workouts', 'routines', 'customEx', 'gymCards']) expect(ids(ab[f]).sort()).toEqual(ids(ba[f]).sort())
    expect(ab.bodyweight).toEqual(ba.bodyweight)
    expect([...ab.favEx].sort()).toEqual([...ba.favEx].sort())
    expect(ab.exWeights).toEqual(ba.exWeights)
    const again = mergeStates(A(), ab)
    expect(ids(again.workouts)).toEqual(ids(ab.workouts))
    expect(ids(again.routines)).toEqual(ids(ab.routines))
    expect(mergeStates(A(), A()).workouts).toEqual(A().workouts)
  })

  it('sorts workouts by day and start, takes the later _ts, drops _rev, does not touch inputs', () => {
    const a = A(), b = B()
    const m = mergeStates(a, b)
    expect(m.workouts.map(w => w.d)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
    expect(m._ts).toBe(200)
    expect('_rev' in m).toBe(false)
    expect(a).toEqual(A())
    expect(b).toEqual(B())
    m.workouts[0].entries.push('x')
    expect(a.workouts[0].entries).toEqual([])
  })

  it('tolerates a missing side and missing lists', () => {
    expect(mergeStates(A(), null)).toEqual(A())
    expect(mergeStates(null, B())).toEqual(B())
    const sparse = { _ts: 5, workouts: null, routines: undefined }
    const m = mergeStates(sparse, { _ts: 1, workouts: [workout('w')], bodyweight: undefined })
    expect(ids(m.workouts)).toEqual(['w'])
    expect(m.bodyweight).toEqual([])
  })

  it('a workout without an id is kept once by day and start', () => {
    const legacy = { d: '2026-09-01', start: 5, entries: [] }
    const m = mergeStates({ _ts: 2, workouts: [legacy] }, { _ts: 1, workouts: [{ ...legacy }, { d: '2026-09-01', start: 6, entries: [] }] })
    expect(m.workouts).toHaveLength(2)
  })

  // Editing the date of a pre-id workout changes the very thing it is keyed by, so the other
  // device's untouched copy has to be recognised as the same record. retimeWorkout freezes the
  // old day-and-start as the id, which is what makes that hold.
  it('a legacy workout moved to another day replaces its untouched copy', () => {
    const legacy = { d: '2026-09-01', start: 5, entries: [], prs: [] }
    const moved = retimeWorkout(legacy, '2026-08-20', '07:00')
    const m = mergeStates({ _ts: 2, workouts: [moved] }, { _ts: 1, workouts: [{ ...legacy }] })
    expect(m.workouts).toHaveLength(1)
    expect(m.workouts[0].d).toBe('2026-08-20')
  })

  // Why the id is the old key rather than a fresh one: a new id shares nothing with the copy
  // on the other device, so the union keeps both and the workout comes back twice.
  it('a fresh id on the same edit would have duplicated it', () => {
    const legacy = { d: '2026-09-01', start: 5, entries: [], prs: [] }
    const renamed = { ...legacy, id: 'brand-new', d: '2026-08-20' }
    const m = mergeStates({ _ts: 2, workouts: [renamed] }, { _ts: 1, workouts: [{ ...legacy }] })
    expect(m.workouts).toHaveLength(2)
  })

  // The report that started this: desktop adopted the server copy at T0, the phone logged a
  // workout at T1, the desktop then changed one setting at T2 and pushed its whole document.
  it('the desktop setting and the phone workout both survive', () => {
    const t0 = base({ _ts: 1000, workouts: [workout('w1')], restSec: 90 })
    const server = { ...t0, _ts: 1001, workouts: [workout('w1'), workout('from-phone', '2026-09-05')], _rev: 4 }
    const desktop = { ...t0, _ts: 1002, restSec: 75 }
    const m = mergeStates(desktop, server)
    expect(ids(m.workouts)).toEqual(['w1', 'from-phone'])
    expect(m.restSec).toBe(75)
    expect(m._ts).toBe(1002)
  })
})

describe('sign-in adoption helpers', () => {
  const server = { _ts: 100, unit: 'lb', restSec: 60, workouts: [{ id: 'w1', d: '2026-09-01' }], bodyweight: [{ d: '2026-09-01', w: 80, t: 1 }], routines: [{ id: 'r1', name: 'A' }], week: { 1: ['r1'] } }
  const local = { _ts: 900, unit: 'kg', restSec: 90, workouts: [{ id: 'w9', d: '2026-09-11' }], bodyweight: [{ d: '2026-09-11', w: 81, t: 2 }, { d: '2026-09-01', w: 79, t: 9 }], routines: [{ id: 'rg', name: 'Guest' }], customEx: [{ id: 'c1', name: 'x' }], week: { 2: ['rg'] } }
  it('localExtras counts what the device has that the server does not', () => {
    expect(localExtras(local, server)).toEqual({ workouts: 1, bodyweight: 1, customEx: 1 })
    expect(localExtras(server, server)).toEqual({ workouts: 0, bodyweight: 0, customEx: 0 })
    expect(localExtras(null, server)).toEqual({ workouts: 0, bodyweight: 0, customEx: 0 })
  })
  it('mergeStates with prefer keeps the preferred side\'s settings and plan although the other is newer', () => {
    const m = mergeStates(server, local, { prefer: 'a' })
    expect(m.unit).toBe('lb'); expect(m.restSec).toBe(60); expect(m.week).toEqual({ 1: ['r1'] })
    expect(m.workouts.map(w => w.id)).toEqual(['w1', 'w9'])
    expect(m.routines.map(r => r.id).sort()).toEqual(['r1', 'rg'])
    expect(m.customEx.map(e => e.id)).toEqual(['c1'])
    // the weigh-in both sides have for the same day: the later `t` wins, as between devices
    expect(m.bodyweight.find(e => e.d === '2026-09-01').w).toBe(79)
    expect(mergeStates(server, local).unit).toBe('kg')   // without prefer the newer copy decides
  })
})

// A conflict used to hand every routine both sides had to the copy whose WHOLE state was newer.
// The phone edits the push day, then the desktop toggles a setting: the desktop's copy is newer,
// and the phone's edit was gone. Each routine now carries its own edit time.
describe('routines keep the version edited last', () => {
  const r = (id, reps, ts) => ({ id, name: id, ex: [{ id: 'bench', sets: 3, reps }], ...(ts != null ? { _ts: ts } : {}) })

  it('the older copy\'s routine wins when it was edited after the newer copy\'s', () => {
    const phone = base({ _ts: 100, routines: [r('push', 15, 90), r('pull', 8, 10)] })
    const desk = base({ _ts: 200, restSec: 60, routines: [r('push', 10, 20), r('pull', 12, 150)] })
    const m = mergeStates(phone, desk)
    expect(m.restSec).toBe(60)                                              // settings: the newer copy
    expect(m.routines.find(x => x.id === 'push').ex[0].reps).toBe(15)      // edited later on the phone
    expect(m.routines.find(x => x.id === 'pull').ex[0].reps).toBe(12)      // edited later on the desk
    expect(ids(m.routines)).toEqual(['push', 'pull'])                       // the newer copy's order
    expect(mergeStates(desk, phone).routines).toEqual(m.routines)
  })

  it('without stamps, or on a tie, the newer copy\'s version stays', () => {
    const a = base({ _ts: 100, routines: [r('push', 15)] })
    const b = base({ _ts: 200, routines: [r('push', 10)] })
    expect(mergeStates(a, b).routines[0].ex[0].reps).toBe(10)
    const c = base({ _ts: 100, routines: [r('push', 15, 50)] })
    const d = base({ _ts: 200, routines: [r('push', 10, 50)] })
    expect(mergeStates(c, d).routines[0].ex[0].reps).toBe(10)
  })

  it('sign-in (prefer) keeps the preferred side\'s plan whatever the stamps say', () => {
    const server = base({ _ts: 100, routines: [r('push', 10, 10)] })
    const device = base({ _ts: 200, routines: [r('push', 15, 90)] })
    expect(mergeStates(server, device, { prefer: 'a' }).routines[0].ex[0].reps).toBe(10)
  })

  it('stampRoutines stamps a new or edited routine and leaves the rest alone', () => {
    const prev = [r('push', 10, 5), r('pull', 8, 6), r('legs', 5, 7)]
    const next = JSON.parse(JSON.stringify(prev))
    next[0].ex[0].reps = 12                     // edited
    next.push(r('core', 20))                    // new
    next.splice(2, 1)                           // legs deleted
    stampRoutines(prev, next, 1000)
    expect(next.map(x => x._ts)).toEqual([1000, 6, 1000])
    // the stamp alone is not an edit: a routine that only carries a different _ts keeps it
    const again = JSON.parse(JSON.stringify(next))
    again[1]._ts = 99
    stampRoutines(next, again, 2000)
    expect(again.map(x => x._ts)).toEqual([1000, 99, 1000])
  })
})
