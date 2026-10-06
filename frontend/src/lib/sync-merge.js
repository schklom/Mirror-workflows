/* Two copies of the account state, one merged copy.
 *
 * The server refuses a push over a document the device never saw (PUT /api/data with a stale
 * `baseRev` answers 409 and hands back the current document). Before revisions the newer `_ts`
 * simply replaced the other copy wholesale — which is exactly how a desktop tab that sat open
 * all day dropped the workout the phone logged in the meantime. The merge keeps both sides'
 * entries and lets the newer copy decide everything that has no natural union.
 *
 * Rules, by field:
 *   - scalars and settings, `week`, `dayPlan`, `wc`, `reminder`, `queue`, `rotation`, …: each from
 *     the copy that changed it last by its own stamp in `edited` (stampEdits; `week`, `dayPlan`,
 *     exNotes and barWeights per day or per exercise), from the copy with the newer `_ts` when
 *     neither side stamped it or on a tie
 *   - equipProfiles, gymCards: union by id; of an id that both have, field by field as below
 *   - workouts, routines, customEx, equipProfiles, gymCards: of an id that both have, each field
 *     from the side that changed it last by its own stamp (`_f`, stampEntry / mergeEntry), the
 *     version edited last for every field neither side stamped
 *   - customEx: union by id; of an id that both have, the version edited last by its own `_ts`
 *     (stampCustomEx), the newer copy's on a tie — a photo or link added on one device must not
 *     be lost to the other's copy just because that one logged a set since
 *   - workouts: union by id; of an id that both have, the version edited last by its own `_ts`
 *     (stampWorkout — a workout changed after it was logged: its sets edited, moved to another
 *     day, its length or note corrected), the newer copy's on a tie; sorted by day and start
 *     like every other writer. Its `media` list is the exception: the union by hash of both
 *     copies' lists (the kept version's in its order, then the other's extras), so a photo added
 *     on one device survives the other's edit of the same workout — or its own photo
 *     (mergeWorkoutMedia)
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
 * Two rules come before all of these:
 *
 *   - Units. Every weight in a copy is in its `unit`, so two copies in different units are never
 *     merged number by number: one is brought into the other's unit first (sameUnit). The unit
 *     that stays is the one chosen last — `unitSet.at`, stamped by a unit switch — or, with no
 *     stamp to tell, the newer copy's; with `prefer`, the preferred side's. A switch that only
 *     changed the label (`unitSet.convert === false`: the numbers were in the new unit all along)
 *     relabels the other copy instead of converting it. A copy converted to lb on one device used
 *     to meet the other device's kg copy and come back as kg with lb numbers under it.
 *   - Reset. "Reset everything" stamps the empty copy with `resetAt` and with `resetIds`: the keys
 *     of every entry it wiped — workouts, routines, custom exercises, weigh-ins (day and entry
 *     time), gym cards, equipment profiles, favourites, notes, bar weights and the stamped
 *     settings maps — of this device's copy and of the server's (resetIdsOf). A copy that has not
 *     seen that reset (an older or no `resetAt`) loses exactly those entries and keeps everything
 *     else, whatever its dates say: a CSV or Apple Health import of old sessions, a device whose
 *     clock runs behind, an entry with no date at all (sinceReset). Only a reset stamped before
 *     `resetIds` existed falls back to judging by time. The reset copy's settings and plan win
 *     whatever the `_ts`. `resetAt` only ever moves forward: the merge keeps the later one (with
 *     its ids; the union of both for the same reset; with `prefer`, the preferred side's), and so do a replace in
 *     the store and the server's PUT — a restored backup that carried no stamp would otherwise be
 *     taken for a copy older than the reset and wiped again. Before, a device with an unsent
 *     change got the 409, merged, and its union brought the whole wiped profile back. Not with
 *     `prefer`: a sign-in adds what a device logged signed out, which is not a copy of this
 *     account's history.
 *
 * After all of these, removals: an entry either copy records in `deleted` (stampDeletions) as
 * removed after it was last edited is left out, whatever the other copy still holds. With
 * `prefer` the reset stamp and the removals are the preferred side's only. Without it a
 * device that came back online after any time away brought back every workout, routine, custom
 * exercise, weigh-in or favourite the other device had removed meanwhile.
 */
import { beatsWeight } from './exercises.js'
import { bestWeightForEntry } from './history.js'
import { convertStateUnit, convertBodyWeight } from './units.js'

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

/**
 * The photos and videos of a workout both copies have: `kept`'s list as it stands (its order,
 * its refs), then every ref of `other`'s list whose hash `kept` lacks. Whole-record merging lost a
 * photo added on one device whenever the other edited that workout's note, date or length, or
 * added a photo of its own, later — the other copy's version was kept, and with it its list.
 *
 * The price is the file's known limit, one field in: with no record of what was removed, a photo
 * taken off on one device inside the conflict window comes back from the other copy that still
 * lists it — a resurrected photo is one tap to remove again, a lost one is gone. A removal the
 * other device has already pulled sticks, since neither copy lists it any more. Refs are carried
 * as they are; readers normalise and cap (workoutMediaOf). Mutates and returns `kept`.
 */
export function mergeWorkoutMedia(kept, other) {
  if (!kept || typeof kept !== 'object') return kept
  const mine = list(kept.media)
  const theirs = list(other?.media)
  if (!theirs.length) return kept
  const hashOf = m => (m && typeof m === 'object' && typeof m.hash === 'string' ? m.hash : null)
  const seen = new Set(mine.map(hashOf).filter(Boolean))
  const extra = []
  for (const m of theirs) {
    const h = hashOf(m)
    if (!h || seen.has(h)) continue
    seen.add(h)
    extra.push(clone(m))
  }
  if (extra.length) kept.media = [...(Array.isArray(kept.media) ? kept.media : []), ...extra]
  return kept
}
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

// ---- Entries merged field by field ----------------------------------------------------------
//
// A workout, routine, custom exercise, equipment profile or gym card edited on two devices kept
// the version edited last as a whole: a set corrected from 100 to 110 on one device was reverted
// by a note added on the other, a routine's 3 sets turned 5 lost to a rename, a custom exercise's
// photo to a rename. Each edit now records, per field, when it changed it (`_f`, stampEntry), and
// the merge takes every field from the side that changed it last (mergeEntry). A field neither
// side stamped follows the version edited last, as before.
const ENTRY_META = new Set(['id', '_ts', '_f'])
const fieldTime = (x, k) => Number(x?._f?.[k]) || 0
const sameJSON = (x, y) => JSON.stringify(x) === JSON.stringify(y)

/**
 * Stamps `x`, the new version of an entry whose previous version is `old`, as edited at `now`:
 * its `_ts`, and in `_f` every field that differs from `old`. A new entry gets its `_ts` only.
 * Mutates and returns `x`.
 */
export function stampEntry(old, x, now) {
  if (!x || typeof x !== 'object') return x
  x._ts = now
  if (!old || typeof old !== 'object') return x
  const f = isMap(old._f) ? { ...old._f } : {}
  for (const k of new Set([...Object.keys(old), ...Object.keys(x)])) {
    if (ENTRY_META.has(k)) continue
    if ((k in old) !== (k in x) || !sameJSON(old[k], x[k])) f[k] = now
  }
  if (Object.keys(f).length) x._f = f; else delete x._f
  return x
}

/**
 * Two versions of one entry: the version edited last (`_ts`; `a` on a tie), with every field the
 * other side changed later (`_f`) taken from that side, removal included. Returns a new object.
 */
export function mergeEntry(a, b) {
  const [n, o] = (Number(b?._ts) || 0) > (Number(a?._ts) || 0) ? [b, a] : [a, b]
  const out = clone(n)
  for (const k of new Set([...Object.keys(n), ...Object.keys(o)])) {
    if (ENTRY_META.has(k)) continue
    if (fieldTime(o, k) > fieldTime(n, k)) { if (k in o) out[k] = clone(o[k]); else delete out[k] }
  }
  const f = { ...(isMap(o._f) ? o._f : {}) }
  for (const [k, v] of Object.entries(isMap(n._f) ? n._f : {})) if (!((Number(f[k]) || 0) > (Number(v) || 0))) f[k] = v
  if (Object.keys(f).length) out._f = f; else delete out._f
  const ts = Math.max(Number(a?._ts) || 0, Number(b?._ts) || 0)
  if (ts) out._ts = ts
  return out
}

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

const unitOf = S => (S?.unit === 'lb' ? 'lb' : 'kg')
const unitStamp = S => Number(S?.unitSet?.at) || 0

/**
 * `follow` in the unit of `lead`: converted, or only relabelled when `lead`'s last switch kept the
 * numbers (see the file's header). Returns `follow` itself when the units already agree.
 */
export function inUnitOf(follow, lead) {
  const to = unitOf(lead)
  if (!follow || unitOf(follow) === to) return follow
  if (lead?.unitSet?.convert === false) return { ...follow, unit: to }
  return convertStateUnit({ ...follow, unit: unitOf(follow) }, to)
}

/** When the entries of a copy were made — what sinceReset holds against a reset without ids. */
const workoutTime = w => Number(w?._ts) || Number(w?.end) || Number(w?.start) || 0

// What a reset records of the entries it wiped (resetIds), by field: how an entry is named.
const bodyweightKey = e => `${e?.d}|${e?.t ?? ''}`
const RESET_LISTS = {
  workouts: workoutKey, routines: x => x?.id, customEx: x => x?.id, bodyweight: bodyweightKey,
  gymCards: x => x?.id, equipProfiles: x => x?.id, favEx: x => x,
}
const RESET_MAPS = ['exNotes', 'barWeights', 'balanceOverrides', 'loadKind', 'plates']
/** An entry's name in resetIds: a workout's id (or day and start), a weigh-in's day and time, … */
export const entryKey = (field, x) => String(RESET_LISTS[field](x))
// Per field, the most names a reset keeps — far more workouts than anyone logs, and a bound on
// the document all the same. Past it the oldest names go first.
export const RESET_ID_MAX = 20000
const capIds = xs => (xs.length > RESET_ID_MAX ? xs.slice(xs.length - RESET_ID_MAX) : xs)

/** Every field's names from `a` then `b`, each once, capped (see RESET_ID_MAX). */
export function mergeResetIds(a, b) {
  const out = {}
  for (const f of [...Object.keys(RESET_LISTS), ...RESET_MAPS]) {
    const xs = [...new Set([...list(a?.[f]), ...list(b?.[f])].filter(k => k != null).map(String))]
    if (xs.length) out[f] = capIds(xs)
  }
  return out
}

/** The names of every entry the given copies hold — what a reset wipes (see the file's header). */
export function resetIdsOf(...copies) {
  let out = {}
  for (const S of copies) {
    if (!S || typeof S !== 'object') continue
    const one = {}
    for (const [f, key] of Object.entries(RESET_LISTS)) one[f] = list(S[f]).filter(x => x != null).map(key)
    for (const f of RESET_MAPS) one[f] = Object.keys(isMap(S[f]) ? S[f] : {})
    out = mergeResetIds(out, one)
  }
  return out
}

/**
 * What a copy that has not seen a reset still contributes after it (see the file's header): with
 * the reset's `ids`, everything but the entries it wiped; without (a reset from before ids were
 * kept), only the entries made after `at`. The kept loads are those of the workouts that remain.
 */
export function sinceReset(S, at, ids) {
  const out = clone(S)
  if (ids && typeof ids === 'object') {
    for (const [f, key] of Object.entries(RESET_LISTS)) {
      const gone = new Set(list(ids[f]).map(String))
      if (Array.isArray(S[f])) out[f] = clone(S[f].filter(x => x == null || !gone.has(String(key(x)))))
    }
    for (const f of RESET_MAPS) {
      const gone = new Set(list(ids[f]).map(String))
      if (isMap(S[f])) out[f] = clone(Object.fromEntries(Object.entries(S[f]).filter(([k]) => !gone.has(k))))
    }
  } else {
    const after = v => (Number(v) || 0) > at
    out.workouts = list(S.workouts).filter(w => w && after(workoutTime(w)))
    out.routines = list(S.routines).filter(r => r && after(r._ts))
    out.customEx = list(S.customEx).filter(c => c && after(c._ts))
    out.bodyweight = list(S.bodyweight).filter(e => e && after(e.t))
    // No time of their own: taken for what they were before the reset, which cleared them.
    out.equipProfiles = []
    out.gymCards = []
    out.favEx = []
    out.exNotes = {}
    out.barWeights = {}
    for (const f of ['balanceOverrides', 'loadKind', 'plates']) {
      out[f] = Object.fromEntries(Object.entries(isMap(S[f]) ? S[f] : {}).filter(([, v]) => after(stampOf(v))))
    }
  }
  const ex = {}
  for (const w of out.workouts) {
    for (const e of list(w.entries)) {
      if (e?.id == null) continue
      const wt = bestWeightForEntry(e)
      if (wt > 0 && (!ex[e.id] || beatsWeight(e.id, wt, ex[e.id].w))) ex[e.id] = { w: wt, d: w.d }
    }
  }
  out.exWeights = ex
  // The reset copy's settings, plan and unit win whatever this copy's own stamps say (the file's
  // header): stamps from before the reset would otherwise outrank the fresh profile's defaults,
  // a unit switch made long ago would bring the old unit back over the reset's.
  delete out.edited
  delete out.unitSet
  return out
}

// ---- Deletions (`deleted`) ------------------------------------------------------------------
//
//   S.deleted = { workouts: { <key>: at }, routines: {…}, customEx, bodyweight, gymCards,
//                 equipProfiles, favEx }
//
// A positive `at` is when the entry was removed on some device; a negative one (-at) is when it
// was added back after such a removal (a favourite starred again). The store writes them on every
// change (stampDeletions, useStore update) and the merge honours them (applyDeletions): a removal
// beats any copy of the entry edited before it, so a device that was offline for a week no longer
// brings back the workout, routine or custom exercise deleted meanwhile. An edit made after the
// removal (the entry's own `_ts`, a weigh-in's `t`) keeps it, as does an add-back stamped later.
const DEL_LISTS = {
  workouts: workoutKey, routines: x => x?.id, customEx: x => x?.id, bodyweight: e => e?.d,
  gymCards: x => x?.id, equipProfiles: x => x?.id, favEx: x => x,
}
// When an entry was last edited, to hold against a removal. Entries with no time of their own
// (favourites, and cards and profiles saved before they were stamped) count as older than any
// removal.
const DEL_TIME = {
  workouts: workoutTime, routines: x => Number(x?._ts) || 0, customEx: x => Number(x?._ts) || 0,
  bodyweight: e => Number(e?.t) || 0, gymCards: x => Number(x?._ts) || 0, equipProfiles: x => Number(x?._ts) || 0,
}
// Per field, the most stamps kept; past it the oldest go first.
export const DELETED_MAX = 5000
const capStamps = m => {
  const ks = Object.keys(m)
  if (ks.length <= DELETED_MAX) return m
  ks.sort((x, y) => Math.abs(m[x]) - Math.abs(m[y]))
  for (const k of ks.slice(0, ks.length - DELETED_MAX)) delete m[k]
  return m
}

/**
 * Records in `next.deleted` every entry `prev` had and `next` no longer has, at `now`, and marks
 * as added back (`-now`) any entry `next` brought in again whose removal was on record (and any
 * favourite starred). Mutates and returns `next`; adds no `deleted` when there is nothing to record.
 */
export function stampDeletions(prev, next, now = Date.now()) {
  if (!next || typeof next !== 'object') return next
  const del = isMap(next.deleted) ? next.deleted : {}
  let touched = false
  for (const [f, key] of Object.entries(DEL_LISTS)) {
    const before = list(prev?.[f]), after = list(next[f])
    if (before === after) continue
    const have = new Set(after.filter(x => x != null).map(x => String(key(x))))
    const m = isMap(del[f]) ? del[f] : {}
    let changed = false
    const time = DEL_TIME[f] || (() => 0)
    for (const x of before) {
      if (x == null) continue
      const k = String(key(x))
      // Never stamped before the entry's own time: a removal is always after what it removed,
      // whatever this device's clock says (stampChange).
      if (!have.has(k)) { m[k] = Math.max(now, time(x) + 1); changed = true }
    }
    // Added back: only a key this change brought in, not every key the copy merely still holds.
    // A copy keeps an entry whose removal it has on record when that entry was edited after the
    // removal (applyDeletions); re-stamping it as added back on any unrelated change made the
    // stale copy outrank a later removal from another device, and the entry came back everywhere.
    // A favourite has no edit time of its own, so a star is always stamped: a device that never
    // saw the earlier unstar must still win against it with the star it set later.
    const had = new Set(before.filter(x => x != null).map(x => String(key(x))))
    for (const k of have) {
      if (had.has(k)) continue
      if (k in m ? m[k] > 0 : f === 'favEx') { m[k] = -now; changed = true }
    }
    if (changed) { del[f] = capStamps(m); touched = true }
  }
  if (touched) next.deleted = del
  return next
}

/** Both copies' records of removals: per entry, the later stamp. */
export function mergeDeletions(a, b) {
  const out = {}
  for (const f of Object.keys(DEL_LISTS)) {
    const x = isMap(a?.[f]) ? a[f] : {}, y = isMap(b?.[f]) ? b[f] : {}
    const m = { ...x }
    for (const [k, v] of Object.entries(y)) if (!(k in m) || Math.abs(Number(v) || 0) > Math.abs(Number(m[k]) || 0)) m[k] = v
    if (Object.keys(m).length) out[f] = capStamps(m)
  }
  return Object.keys(out).length ? out : null
}

/**
 * `S` without the entries `deleted` says were removed after they were last edited. Returns the
 * removed workouts too (their kept loads need a second look). Mutates `S`.
 */
function applyDeletions(S, deleted) {
  const gone = []
  if (!deleted) return gone
  for (const [f, key] of Object.entries(DEL_LISTS)) {
    const m = deleted[f]
    if (!isMap(m) || !Array.isArray(S[f])) continue
    const time = DEL_TIME[f] || (() => 0)
    S[f] = S[f].filter(x => {
      if (x == null) return true
      const at = Number(m[String(key(x))]) || 0
      const drop = at > 0 && at >= time(x)
      if (drop && f === 'workouts') gone.push(x)
      return !drop
    })
  }
  return gone
}

// ---- Edit stamps (`edited`) -----------------------------------------------------------------
//
//   S.edited = { restSec: at, queue: at, rotation: at, 'week.3': at, 'dayPlan.2026-10-08': at, … }
//
// When each setting, and each day of the plan, was last changed on some device. The store writes
// them on every change (stampEdits, useStore update) and the merge takes each one from the copy
// that changed it last (applyEdits) rather than the whole lot from the copy that changed anything
// last: Wednesday set on an offline phone survives the weigh-in the desktop logged meanwhile, and
// a rotation pass refilled on the phone survives a setting flipped on the desktop. Fields with a
// merge of their own are not stamped here; a field nobody stamped follows the newer copy, as before.
const OWN_MERGE = new Set([
  '_ts', '_rev', 'active', 'unit', 'unitSet', 'resetAt', 'resetIds', 'deleted', 'edited',
  'workouts', 'routines', 'customEx', 'equipProfiles', 'gymCards', 'bodyweight', 'favEx',
  'exWeights', 'balanceOverrides', 'loadKind', 'plates',
])
// Stamped per key instead of whole: one day of the plan, one exercise's note or bar.
const PER_KEY = new Set(['week', 'dayPlan', 'exNotes', 'barWeights'])
// A per-key stamp of a key neither copy holds any more is dropped after this long.
const EDIT_KEEP_MS = 180 * 86400000
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y)

/**
 * Stamps in `next.edited` every field (and every day of the plan, note, bar weight) that differs
 * from `prev`, at `now`. Mutates and returns `next`.
 */
export function stampEdits(prev, next, now = Date.now()) {
  if (!next || typeof next !== 'object') return next
  const ed = isMap(next.edited) ? next.edited : {}
  let touched = false
  for (const k of new Set([...Object.keys(prev || {}), ...Object.keys(next)])) {
    if (OWN_MERGE.has(k)) continue
    const p = prev?.[k], n = next[k]
    if (PER_KEY.has(k)) {
      const pm = isMap(p) ? p : {}, nm = isMap(n) ? n : {}
      if (p === n) continue
      for (const s of new Set([...Object.keys(pm), ...Object.keys(nm)])) {
        if ((s in pm) !== (s in nm) || !same(pm[s], nm[s])) { ed[`${k}.${s}`] = now; touched = true }
      }
    } else if (p !== n && !same(p, n)) { ed[k] = now; touched = true }
  }
  if (touched) {
    for (const [k, at] of Object.entries(ed)) {
      const dot = k.indexOf('.')
      if (dot < 0 || now - at < EDIT_KEEP_MS) continue
      const m = next[k.slice(0, dot)]
      if (!isMap(m) || !(k.slice(dot + 1) in m)) delete ed[k]
    }
    next.edited = ed
  }
  return next
}

/** Both copies' edit stamps: per key, the later one. */
function mergeEdits(a, b) {
  const x = isMap(a) ? a : {}, y = isMap(b) ? b : {}
  const out = { ...x }
  for (const [k, v] of Object.entries(y)) if (!((Number(out[k]) || 0) >= (Number(v) || 0))) out[k] = v
  return Object.keys(out).length ? out : null
}

/**
 * Into `out` (a merge built from `n`, the newer copy), every stamped field and plan day from the
 * copy that changed it last, removal included. A tie or a field nobody stamped stays as it is.
 */
function applyEdits(out, n, o) {
  const en = isMap(n.edited) ? n.edited : {}, eo = isMap(o.edited) ? o.edited : {}
  for (const k of new Set([...Object.keys(en), ...Object.keys(eo)])) {
    const tn = Number(en[k]) || 0, to = Number(eo[k]) || 0
    if (tn === to) continue
    const src = to > tn ? o : n
    const dot = k.indexOf('.')
    if (dot < 0) {
      if (OWN_MERGE.has(k) || PER_KEY.has(k)) continue
      if (k in src) out[k] = clone(src[k]); else delete out[k]
      continue
    }
    const f = k.slice(0, dot), s = k.slice(dot + 1)
    if (!PER_KEY.has(f)) continue
    const from = isMap(src[f]) ? src[f] : {}
    const into = isMap(out[f]) ? out[f] : (out[f] = {})
    if (s in from) into[s] = clone(from[s]); else delete into[s]
  }
}

// `prefer` names the side whose settings, plan and per-exercise config win regardless of `_ts`:
// on sign-in the server's profile is the truth and the device only contributes the entries it
// logged while signed out. Without it the newer copy decides, as for a conflict between devices.
export function mergeStates(a0, b0, { prefer } = {}) {
  if (!a0) return b0 ? clone(b0) : b0
  if (!b0) return clone(a0)
  let a = a0, b = b0
  // A reset seen by one copy only: the other keeps what was made after it, and the reset copy
  // decides the rest (the file's header).
  let side = prefer === 'a' || prefer === 'b' ? prefer : newerOf(a, b) === a ? 'a' : 'b'
  const ra = Number(a.resetAt) || 0, rb = Number(b.resetAt) || 0
  if (!prefer) {
    if (ra > rb) { b = sinceReset(b, ra, a.resetIds); side = 'a' }
    else if (rb > ra) { a = sinceReset(a, rb, b.resetIds); side = 'b' }
  }
  // The reset stamp only moves forward, with the names it wiped. With `prefer` it is the
  // preferred side's: a reset made on a guest copy, or on a phone in local mode, wiped that copy,
  // not the account it signs in to — carried over, it made every other device of the account drop
  // its unsent settings and plan as if the account had been reset (a backup import keeps the
  // stamp of the copy it replaces on its own, keepReset).
  const resetAt = prefer ? (prefer === 'a' ? ra : rb) : Math.max(ra, rb)
  const resetIds = prefer ? (prefer === 'a' ? a0 : b0).resetIds || null
    : ra === rb ? (a0.resetIds || b0.resetIds ? mergeResetIds(a0.resetIds, b0.resetIds) : null)
    : (ra > rb ? a0 : b0).resetIds || null
  // One unit before anything is compared.
  let lead = null
  if (unitOf(a) !== unitOf(b)) {
    lead = prefer || unitStamp(a) === unitStamp(b) ? (side === 'a' ? a : b) : unitStamp(a) > unitStamp(b) ? a : b
    if (lead === a) b = inUnitOf(b, a); else a = inUnitOf(a, b)
  }
  const n = side === 'a' ? a : b
  const o = n === a ? b : a
  const out = clone(n)
  // The unit is the lead's by now; so is the record of choosing it.
  const unitBy = lead || (unitStamp(a) >= unitStamp(b) ? a : b)
  if (unitBy.unitSet) out.unitSet = clone(unitBy.unitSet)
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
      // Field by field (mergeEntry): the sets from the side that edited them last, the note from
      // the side that edited it last.
      const kept = mergeEntry(w, alt)
      const [last, first, byLast, byFirst] = (alt._ts || 0) > (w._ts || 0) ? [alt, w, o, n] : [w, alt, n, o]
      if ((last._ts || 0) !== (first._ts || 0) && JSON.stringify(last.entries) !== JSON.stringify(first.entries)) {
        const by = JSON.stringify(kept.entries) === JSON.stringify(first.entries) ? byFirst : byLast
        for (const e of [...list(kept.entries), ...list(w.entries), ...list(alt.entries)]) {
          if (e?.id == null) continue
          if (!editedBy.has(e.id)) editedBy.set(e.id, new Set())
          editedBy.get(e.id).add(by.exWeights)
        }
      }
      return kept
    })
  }
  // Of a workout both copies have, the kept version's media list gains the other's extras — with
  // `prefer` too: signing in must not drop a photo added while signed out any more than a
  // conflict may.
  {
    const nBy = new Map(list(n.workouts).map(w => [workoutKey(w), w]))
    const oBy = new Map(list(o.workouts).map(w => [workoutKey(w), w]))
    for (const w of out.workouts) {
      const key = workoutKey(w)
      const x = nBy.get(key), y = oBy.get(key)
      if (x && y) { mergeWorkoutMedia(w, x); mergeWorkoutMedia(w, y) }
    }
  }
  out.workouts.sort(byDayStart)
  for (const f of ['routines', 'customEx', 'equipProfiles', 'gymCards']) {
    if (list(n[f]).length || list(o[f]).length) out[f] = unionById(n[f], o[f]).map(clone)
  }
  // A routine edited on both sides keeps the version edited last. Taking the newer copy's
  // version dropped a plan edit made on one device whenever the other had since logged a set or
  // flipped a setting — its whole copy was newer, its version of that routine was not. `prefer`
  // (sign-in) keeps the preferred side's plan as it is.
  // Field by field (mergeEntry): a routine's sets changed on one device and its name on the other
  // are both kept. The same for a custom exercise (a photo added on one device survives a rename
  // on the other), an equipment profile and a gym card.
  if (!prefer) {
    for (const f of ['routines', 'customEx', 'equipProfiles', 'gymCards']) {
      if (!out[f]) continue
      const other = new Map(list(o[f]).filter(x => x?.id != null).map(x => [x.id, x]))
      out[f] = out[f].map(x => {
        const alt = x?.id != null && other.get(x.id)
        return alt ? mergeEntry(x, alt) : x
      })
    }
  }
  out.bodyweight = mergeBodyweight(n.bodyweight, o.bodyweight).map(clone)
  if (list(n.favEx).length || list(o.favEx).length) out.favEx = [...new Set([...list(n.favEx), ...list(o.favEx)])]
  // What either device removed stays removed (the `deleted` section above). A workout taken out
  // this way leaves its exercises' kept loads to be read again, as an edit of it would: from the
  // merged history and from the deleting copy's own, which already let go of what it held.
  // With `prefer` only the preferred side's removals count: a guest's are about the guest's own
  // entries, and keyed by day (weigh-ins) or exercise (favourites) they also named the account's
  // weigh-in of that day and its favourite, which the guest never had.
  const deleted = prefer ? mergeDeletions(prefer === 'a' ? a.deleted : b.deleted, null) : mergeDeletions(a.deleted, b.deleted)
  for (const w of applyDeletions(out, deleted)) {
    const k = String(workoutKey(w))
    const by = [n, o].filter(S => Number(S.deleted?.workouts?.[k]) > 0).map(S => S.exWeights)
    for (const e of list(w.entries)) {
      if (e?.id == null) continue
      if (!editedBy.has(e.id)) editedBy.set(e.id, new Set())
      for (const src of by) editedBy.get(e.id).add(src)
    }
  }
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
  // Each stamped setting and plan day from the copy that changed it last (the `edited` section
  // above). `prefer` (sign-in) keeps the preferred side's, stamps and all.
  if (!prefer) {
    applyEdits(out, n, o)
    const edited = mergeEdits(n.edited, o.edited)
    if (edited) out.edited = edited; else delete out.edited
  }
  if (deleted) out.deleted = deleted; else delete out.deleted
  out._ts = Math.max(a._ts || 0, b._ts || 0)
  if (resetAt) out.resetAt = resetAt
  if (resetIds) out.resetIds = resetIds
  else delete out.resetIds
  delete out._rev
  return out
}

/**
 * `next` replacing `cur` wholesale (a backup import, a reset) never takes the reset stamp back:
 * the later `resetAt` stays, with its names — a restored backup that carried none would otherwise
 * be taken, on every device that saw the reset, for a copy from before it and wiped again.
 * Mutates and returns `next`.
 */
export function keepReset(cur, next) {
  if (!next || typeof next !== 'object') return next
  const rc = Number(cur?.resetAt) || 0, rn = Number(next.resetAt) || 0
  if (rc > rn) {
    next.resetAt = cur.resetAt
    if (cur.resetIds) next.resetIds = clone(cur.resetIds); else delete next.resetIds
  } else if (rc && rc === rn && (cur.resetIds || next.resetIds)) {
    next.resetIds = mergeResetIds(cur.resetIds, next.resetIds)
  }
  return next
}

// ---- A restored backup ------------------------------------------------------------------------
//
// A backup brought back over the profile (Settings, Import) is a deliberate add-back: the main way
// to undo a mistake. Its entries are older than any removal recorded since it was made, so the
// merge used to delete them again (the removal record outlived the restore), at once with "Merge
// them in" and on the next conflict of any other device with "Replace". And a device with an older
// unsent setting change won over the restored settings, which carried no stamp. So a restore marks
// every entry it holds whose removal is on record (here or in `others`) as added back at `now`,
// stamps its settings, plan days and plans as changed at `now`, and keeps the record of removals.

/** Stamps `next`, a restored backup, as described above. Mutates and returns `next`. */
export function stampRestore(next, others = [], now = Date.now()) {
  if (!next || typeof next !== 'object') return next
  let del = mergeDeletions(next.deleted, null)
  for (const o of others) del = mergeDeletions(del, o?.deleted)
  del = del || {}
  for (const [f, key] of Object.entries(DEL_LISTS)) {
    const m = del[f]
    if (!isMap(m)) continue
    for (const x of list(next[f])) {
      if (x == null) continue
      const k = String(key(x))
      if (Number(m[k]) > 0) m[k] = -now
    }
  }
  if (Object.keys(del).length) next.deleted = del; else delete next.deleted
  const ed = isMap(next.edited) ? { ...next.edited } : {}
  for (const k of Object.keys(next)) if (!OWN_MERGE.has(k) && !PER_KEY.has(k)) ed[k] = now
  for (const f of PER_KEY) {
    for (const S of [next, ...others]) for (const s of Object.keys(isMap(S?.[f]) ? S[f] : {})) ed[`${f}.${s}`] = now
  }
  next.edited = ed
  for (const f of ['routines', 'customEx']) for (const x of list(next[f])) if (x && typeof x === 'object') x._ts = now
  return next
}

// ---- One causal time per change ---------------------------------------------------------------
//
// Every stamp above is a wall-clock time, compared between devices. A phone whose clock runs
// behind stamped its later change before the change it had already seen, and lost to it on the
// next merge: its setting, its routine edit, its delete reverted, silently, on every device. So a
// change is stamped after every stamp the copy it was made on carries (stampChange): a change
// made after seeing another always wins over it, whatever either clock says. Only changes neither
// device had seen are still ordered by their clocks.

/** The latest stamp a copy carries: its `_ts`, every setting, removal and entry stamp. */
export function highestStamp(S) {
  let m = 0
  const see = v => { const n = Math.abs(Number(v) || 0); if (n > m) m = n }
  if (!S || typeof S !== 'object') return 0
  see(S._ts)
  see(S.unitSet?.at)
  see(S.resetAt)
  if (isMap(S.edited)) for (const v of Object.values(S.edited)) see(v)
  if (isMap(S.deleted)) for (const f of Object.values(S.deleted)) if (isMap(f)) for (const v of Object.values(f)) see(v)
  for (const f of ['workouts', 'routines', 'customEx', 'equipProfiles', 'gymCards']) {
    for (const x of list(S[f])) {
      if (!x || typeof x !== 'object') continue
      see(x._ts)
      if (isMap(x._f)) for (const v of Object.values(x._f)) see(v)
    }
  }
  for (const f of ['balanceOverrides', 'loadKind', 'plates']) if (isMap(S[f])) for (const v of Object.values(S[f])) see(stampOf(v))
  return m
}

/**
 * Stamps everything the change from `prev` to `next` touched, at one time that comes after every
 * stamp `prev` carries (and `wall`, this device's clock): routines, custom exercises, workouts a
 * screen re-stamped (stampWorkout), removals, settings and plan days. Mutates `next`; returns
 * the time used, for the copy's own `_ts`.
 */
export function stampChange(prev, next, wall = Date.now()) {
  const now = Math.max(Number(wall) || 0, highestStamp(prev) + 1)
  if (!next || typeof next !== 'object') return now
  const before = new Map(list(prev?.workouts).filter(w => w && w.id != null).map(w => [w.id, w]))
  for (const w of list(next.workouts)) {
    if (!w || typeof w !== 'object' || w.id == null || w._ts == null) continue
    const old = before.get(w.id)
    if (old && w._ts !== old._ts) stampEntry(old, w, now)
  }
  // Settings maps whose entries carry their own stamp (mergeStampedMap): an entry the change
  // re-stamped takes the change's time.
  for (const f of ['balanceOverrides', 'loadKind', 'plates']) {
    const p = isMap(prev?.[f]) ? prev[f] : {}, n = isMap(next[f]) ? next[f] : null
    if (!n) continue
    for (const [k, v] of Object.entries(n)) if (isMap(v) && v._ts != null && stampOf(v) !== stampOf(p[k])) v._ts = now
  }
  stampRoutines(prev?.routines, next.routines, now)
  stampCustomEx(prev?.customEx, next.customEx, now)
  stampEntries(prev?.equipProfiles, next.equipProfiles, now)
  stampEntries(prev?.gymCards, next.gymCards, now)
  stampDeletions(prev, next, now)
  stampEdits(prev, next, now)
  return now
}

const sameRoutine = (a, b) => JSON.stringify({ ...a, _ts: 0, _f: 0 }) === JSON.stringify({ ...b, _ts: 0, _f: 0 })

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
    if (!old || (old !== r && !sameRoutine(old, r))) stampEntry(old, r, now)
  }
  return next
}

const sameEntry = (a, b) => JSON.stringify({ ...a, _ts: 0, _f: 0 }) === JSON.stringify({ ...b, _ts: 0, _f: 0 })

/**
 * Stamps `_ts` on every custom exercise of `next` that is new or differs from its version in
 * `prev`, the way stampRoutines does for a plan — the edit time mergeStates needs to keep the
 * version edited last. The store runs it on every change (useStore update). Mutates and returns
 * `next`.
 */
export function stampCustomEx(prev = [], next = [], now = Date.now()) {
  const before = new Map(list(prev).filter(c => c?.id != null).map(c => [c.id, c]))
  for (const c of list(next)) {
    if (!c || typeof c !== 'object' || c.id == null) continue
    const old = before.get(c.id)
    if (!old || (old !== c && !sameEntry(old, c))) stampEntry(old, c, now)
  }
  return next
}

/** stampCustomEx for any list of entries with ids: equipment profiles, gym cards. */
export function stampEntries(prev = [], next = [], now = Date.now()) { return stampCustomEx(prev, next, now) }

// What `local` holds that `server` does not: the workouts and weigh-ins a device logged while it
// was signed out, and the custom exercises they use. Sign-in asks about these before the server's
// profile replaces the local copy; zero of each means there is nothing to ask about.
// A weigh-in on a day the server has one too counts when it differs and was entered later — the
// one "Add them" keeps (mergeBodyweight). Counted only on days the server lacked, a weigh-in
// made on the phone on a day the profile already had one was dropped without the question ever
// being asked. Weights are compared in the server's unit.
export function localExtras(local, server) {
  const have = new Set(list(server?.workouts).map(workoutKey))
  const days = new Map(list(server?.bodyweight).filter(e => e && e.d != null).map(e => [e.d, e]))
  const ex = new Set(list(server?.customEx).map(e => e?.id))
  const from = unitOf(local), to = unitOf(server)
  const differs = (mine, theirs) =>
    (Number(mine.t) || 0) > (Number(theirs.t) || 0) && Number(convertBodyWeight(mine.w, from, to)) !== Number(theirs.w)
  return {
    workouts: list(local?.workouts).filter(w => !have.has(workoutKey(w))).length,
    bodyweight: list(local?.bodyweight).filter(e => e && e.d != null && (!days.has(e.d) || differs(e, days.get(e.d)))).length,
    customEx: list(local?.customEx).filter(e => e && !ex.has(e.id)).length
  }
}
