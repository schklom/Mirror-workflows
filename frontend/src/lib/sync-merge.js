/* Two copies of the account state, one merged copy.
 *
 * The server refuses a push over a document the device never saw (PUT /api/data with a stale
 * `baseRev` answers 409 and hands back the current document). Before revisions the newer `_ts`
 * simply replaced the other copy wholesale — which is exactly how a desktop tab that sat open
 * all day dropped the workout the phone logged in the meantime. The merge keeps both sides'
 * entries and lets the newer copy decide everything that has no natural union.
 *
 * Rules, by field:
 *   - scalars and settings, `week`, `dayPlan`, `wc`, `reminder`, …: from the copy with the newer `_ts`
 *   - customEx, equipProfiles, gymCards: union by id, the newer copy's version of an id that
 *     both have
 *   - workouts: union by id; of an id that both have, the version edited last by its own `_ts`
 *     (stampWorkout — a workout changed after it was logged: its sets edited, moved to another
 *     day, its length or note corrected), the newer copy's on a tie; sorted by day and start
 *     like every other writer
 *   - routines: union by id in the newer copy's order; of an id that both have, the version
 *     edited last by its own `_ts` (stampRoutines), the newer copy's on a tie
 *   - bodyweight: union by day, the later-edited (`t`) entry of a day that both have
 *   - favEx: ordered set union, the newer copy first
 *   - exWeights: union by exercise, the better `w` for that exercise — larger for an ordinary
 *     lift, smaller on an assistance machine (a PR logged on the other device must not be
 *     forgotten, whichever way it runs). An exercise in a workout whose edited version was kept
 *     is the exception: the edit may have taken away the set the kept weight came from, so it
 *     is the best of the merged history and of the editing copy's own, and the other copy's
 *     can no longer bring a corrected typo back. exNotes, barWeights: key union
 *   - balanceOverrides, loadKind, plates: key union; of a key both have, the entry set last by
 *     its own `_ts`, a clear included (mergeStampedMap), the newer copy's on a tie. For plates the
 *     key is the unit, so the inventory of one unit is kept whole, as last edited
 *   - `_ts`: the later of the two; `_rev` dropped (the server sets it); `active` left to the caller
 *
 * Known limit: with no record of what each side deleted, an entry removed on one device inside
 * the conflict window comes back from the other. The window is a few seconds now (the store pulls
 * on resume and every push is conditional), and a resurrected entry beats a lost one. Tombstones
 * would close it.
 */
import { beatsWeight } from './exercises.js'
import { bestWeightForEntry } from './history.js'

const clone = o => JSON.parse(JSON.stringify(o))
const list = v => (Array.isArray(v) ? v : [])

/** The copy with the later `_ts`; on a tie the first argument (callers pass local first). */
export const newerOf = (a, b) => ((b?._ts || 0) > (a?._ts || 0) ? b : a)

/**
 * Entries of `newer` in their order, then those of `older` whose key nothing in `newer` has.
 * Same key → `newer`'s entry. Duplicate keys within one list are dropped (first wins).
 */
export function unionById(newer = [], older = [], key = x => x?.id) {
  const seen = new Set()
  const out = []
  for (const x of [...list(newer), ...list(older)]) {
    const k = key(x)
    if (k == null) { out.push(x); continue }
    if (seen.has(k)) continue
    seen.add(k)
    out.push(x)
  }
  return out
}

const workoutKey = w => (w?.id != null ? w.id : `${w?.d}|${w?.start}`)
const byDayStart = (a, b) => (a.d === b.d ? (a.start || 0) - (b.start || 0) : a.d < b.d ? -1 : 1)

/** One entry per day; where both have a day, the one edited later (`t`); sorted by day. */
export function mergeBodyweight(a = [], b = []) {
  const byDay = new Map()
  for (const e of [...list(a), ...list(b)]) {
    if (!e || e.d == null) continue
    const cur = byDay.get(e.d)
    if (!cur || (e.t || 0) > (cur.t || 0)) byDay.set(e.d, e)
  }
  return [...byDay.values()].sort((x, y) => (x.d < y.d ? -1 : 1))
}

// The kept load per exercise. "The larger one wins" held while the app only ever raised it —
// but an assistance machine progresses downwards, so there the smaller number is the newer,
// harder setting and taking the larger would hand back the help the other device just dropped
// (issue #232). `beatsWeight` knows which way round each exercise runs; the date breaks a tie
// on an exercise where both sides moved in the same direction.
function mergeExWeights(n = {}, o = {}) {
  const out = { ...(o || {}), ...(n || {}) }
  for (const k of Object.keys(o || {})) {
    if (!(n && n[k] && o[k])) continue
    if (beatsWeight(k, o[k].w || 0, n[k].w || 0)) out[k] = o[k]
  }
  return out
}

// The kept load of an exercise that a kept workout edit touched (see mergeStates): the best set in
// the merged history, or the editing copy's own kept load when that is better still — the other
// copy's may be the very typo the edit corrected. `sources` are the exWeights of each copy whose
// edit was kept. Nothing left to read removes the key, as the edit itself did.
function correctedExWeight(id, workouts, sources) {
  let best = null
  const consider = c => { if (c && c.w > 0 && (!best || beatsWeight(id, c.w, best.w))) best = c }
  for (const w of workouts) {
    for (const e of list(w?.entries)) if (e?.id === id) consider({ w: bestWeightForEntry(e), d: w.d })
  }
  for (const src of sources) consider(src?.[id])
  return best
}

/**
 * Stamps `_ts` on a saved workout changed after it was logged — its sets edited, moved to another
 * day or time, its length or its note corrected — the edit time mergeStates needs to keep the
 * version edited last, the way stampRoutines does for a plan. Without it the copy that was newer
 * as a whole decided: a phone that logged a weigh-in after the desktop corrected a workout brought
 * the uncorrected one back on the next conflict. Mutates and returns `w`.
 */
export function stampWorkout(w, now = Date.now()) {
  if (w && typeof w === 'object') w._ts = now
  return w
}

const stampOf = v => (v && typeof v === 'object' ? Number(v._ts) || 0 : 0)
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * A settings map whose entries carry their own edit time (`{ …, _ts }`), such as the Structural
 * Balance overrides or the plate-loading choices: every key of either side, and of a key both have, the entry set last — the
 * same rule a routine follows. Taking the newer copy's entry lost a choice made on one device
 * whenever the other had since logged a set; a plain key union brought a cleared entry back
 * from the side that still had it. So a clear is written as a stamped entry, not a delete, and
 * wins like any other edit. On a tie, or with `prefer`, the newer (preferred) side's entry stays.
 */
export function mergeStampedMap(newer, older, prefer) {
  const n = isMap(newer) ? newer : {}
  const o = isMap(older) ? older : {}
  const out = { ...o, ...n }
  if (!prefer) for (const k of Object.keys(o)) if (k in n && stampOf(o[k]) > stampOf(n[k])) out[k] = o[k]
  return out
}

// `prefer` names the side whose settings, plan and per-exercise config win regardless of `_ts`:
// on sign-in the server's profile is the truth and the device only contributes the entries it
// logged while signed out. Without it the newer copy decides, as for a conflict between devices.
export function mergeStates(a, b, { prefer } = {}) {
  if (!a) return b ? clone(b) : b
  if (!b) return clone(a)
  const n = prefer === 'a' ? a : prefer === 'b' ? b : newerOf(a, b)
  const o = n === a ? b : a
  const out = clone(n)
  out.workouts = unionById(n.workouts, o.workouts, workoutKey).map(clone)
  // A workout edited after it was logged keeps the version edited last, whichever copy is newer
  // as a whole — the same rule as a routine's. `editedBy` notes, per exercise, the copies whose
  // edit of its sets was kept, for the kept loads below. `prefer` (sign-in) keeps the preferred
  // side's version as it is.
  const editedBy = new Map()
  if (!prefer) {
    const mine = new Set(list(n.workouts).map(workoutKey))
    const other = new Map(list(o.workouts).map(w => [workoutKey(w), w]))
    out.workouts = out.workouts.map(w => {
      const key = workoutKey(w)
      const alt = mine.has(key) ? other.get(key) : null
      if (!alt) return w
      const [kept, lost, by] = (alt._ts || 0) > (w._ts || 0) ? [clone(alt), w, o] : [w, alt, n]
      if ((kept._ts || 0) > (lost._ts || 0) && JSON.stringify(kept.entries) !== JSON.stringify(lost.entries)) {
        for (const e of [...list(kept.entries), ...list(lost.entries)]) {
          if (e?.id == null) continue
          if (!editedBy.has(e.id)) editedBy.set(e.id, new Set())
          editedBy.get(e.id).add(by.exWeights)
        }
      }
      return kept
    })
  }
  out.workouts.sort(byDayStart)
  for (const f of ['routines', 'customEx', 'equipProfiles', 'gymCards']) {
    if (list(n[f]).length || list(o[f]).length) out[f] = unionById(n[f], o[f]).map(clone)
  }
  // A routine edited on both sides keeps the version edited last. Taking the newer copy's
  // version dropped a plan edit made on one device whenever the other had since logged a set or
  // flipped a setting — its whole copy was newer, its version of that routine was not. `prefer`
  // (sign-in) keeps the preferred side's plan as it is.
  if (!prefer && out.routines) {
    const other = new Map(list(o.routines).filter(r => r?.id != null).map(r => [r.id, r]))
    out.routines = out.routines.map(r => {
      const alt = r?.id != null && other.get(r.id)
      return alt && (alt._ts || 0) > (r._ts || 0) ? clone(alt) : r
    })
  }
  out.bodyweight = mergeBodyweight(n.bodyweight, o.bodyweight).map(clone)
  if (list(n.favEx).length || list(o.favEx).length) out.favEx = [...new Set([...list(n.favEx), ...list(o.favEx)])]
  out.exWeights = clone(mergeExWeights(n.exWeights, o.exWeights))
  for (const [id, sources] of editedBy) {
    const kept = correctedExWeight(id, out.workouts, sources)
    if (kept) out.exWeights[id] = clone(kept)
    else delete out.exWeights[id]
  }
  for (const f of ['exNotes', 'barWeights']) {
    if (n[f] || o[f]) out[f] = clone({ ...(o[f] || {}), ...(n[f] || {}) })
  }
  // The plate-loading choices (lib/plates.js) are stamped the same way: an exercise's loading and
  // a unit's plate inventory are each one choice, made on one device, that a later set logged on
  // the other must not undo.
  for (const f of ['balanceOverrides', 'loadKind', 'plates']) {
    if (n[f] || o[f]) out[f] = clone(mergeStampedMap(n[f], o[f], prefer))
  }
  out._ts = Math.max(a._ts || 0, b._ts || 0)
  delete out._rev
  return out
}

const sameRoutine = (a, b) => JSON.stringify({ ...a, _ts: 0 }) === JSON.stringify({ ...b, _ts: 0 })

/**
 * Stamps `_ts` on every routine of `next` that is new or differs from its version in `prev` — the
 * edit time mergeStates needs to keep the routine edited last. The store runs it on every change
 * (useStore update), so no screen that edits a plan has to remember to. Mutates and returns `next`.
 */
export function stampRoutines(prev = [], next = [], now = Date.now()) {
  const before = new Map(list(prev).filter(r => r?.id != null).map(r => [r.id, r]))
  for (const r of list(next)) {
    if (!r || r.id == null) continue
    const old = before.get(r.id)
    if (!old || (old !== r && !sameRoutine(old, r))) r._ts = now
  }
  return next
}

// What `local` holds that `server` does not: the workouts and weigh-ins a device logged while it
// was signed out, and the custom exercises they use. Sign-in asks about these before the server's
// profile replaces the local copy; zero of each means there is nothing to ask about.
export function localExtras(local, server) {
  const have = new Set(list(server?.workouts).map(workoutKey))
  const days = new Set(list(server?.bodyweight).map(e => e?.d))
  const ex = new Set(list(server?.customEx).map(e => e?.id))
  return {
    workouts: list(local?.workouts).filter(w => !have.has(workoutKey(w))).length,
    bodyweight: list(local?.bodyweight).filter(e => e && e.d != null && !days.has(e.d)).length,
    customEx: list(local?.customEx).filter(e => e && !ex.has(e.id)).length
  }
}
