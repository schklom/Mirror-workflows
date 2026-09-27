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
 *   - equipProfiles, gymCards: union by id, the newer copy's version of an id that both have
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
 *   - Reset. "Reset everything" stamps the empty copy with `resetAt`. A copy that has not seen that
 *     reset (an older or no `resetAt`) contributes only what was made after it: workouts finished
 *     or edited later (`_ts`, else `end`, else `start`), routines and custom exercises edited later
 *     (`_ts`), weigh-ins entered later (`t`), stamped settings set later — and the reset copy's
 *     settings and plan win whatever the `_ts`. Everything else from before the reset stays
 *     deleted (sinceReset). Before, a device with an unsent change got the 409, merged, and its
 *     union brought the whole wiped profile back. Not with `prefer`: a sign-in adds what a device
 *     logged signed out, which is not a copy of this account's history.
 *
 * Known limit: with no record of what each side deleted, an entry removed on one device inside
 * the conflict window comes back from the other. The window is a few seconds now (the store pulls
 * on resume and every push is conditional), and a resurrected entry beats a lost one. Tombstones
 * would close it.
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

/** When the entries of a copy were made — what sinceReset holds against a reset. */
const workoutTime = w => Number(w?._ts) || Number(w?.end) || Number(w?.start) || 0

/**
 * What a copy that has not seen a reset still contributes after it (see the file's header): only
 * the entries made after `at`. The kept loads are those of the workouts that remain.
 */
export function sinceReset(S, at) {
  const after = v => (Number(v) || 0) > at
  const out = clone(S)
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
  const ex = {}
  for (const w of out.workouts) {
    for (const e of list(w.entries)) {
      if (e?.id == null) continue
      const wt = bestWeightForEntry(e)
      if (wt > 0 && (!ex[e.id] || beatsWeight(e.id, wt, ex[e.id].w))) ex[e.id] = { w: wt, d: w.d }
    }
  }
  out.exWeights = ex
  return out
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
  if (!prefer) {
    const ra = Number(a.resetAt) || 0, rb = Number(b.resetAt) || 0
    if (ra > rb) { b = sinceReset(b, ra); side = 'a' }
    else if (rb > ra) { a = sinceReset(a, rb); side = 'b' }
  }
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
  if (!prefer && out.routines) {
    const other = new Map(list(o.routines).filter(r => r?.id != null).map(r => [r.id, r]))
    out.routines = out.routines.map(r => {
      const alt = r?.id != null && other.get(r.id)
      return alt && (alt._ts || 0) > (r._ts || 0) ? clone(alt) : r
    })
  }
  // A custom exercise edited on both sides keeps the version edited last, the same rule and for
  // the same reason. The merge is whole-entry: a device that later renames an exercise whose
  // media it never saw change brings its old media back (the old file outlives the grace period
  // on the server, so nothing breaks, it is only the older picture).
  if (!prefer && out.customEx) {
    const other = new Map(list(o.customEx).filter(c => c?.id != null).map(c => [c.id, c]))
    out.customEx = out.customEx.map(c => {
      const alt = c?.id != null && other.get(c.id)
      return alt && (alt._ts || 0) > (c._ts || 0) ? clone(alt) : c
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

const sameEntry = (a, b) => JSON.stringify({ ...a, _ts: 0 }) === JSON.stringify({ ...b, _ts: 0 })

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
    if (!old || (old !== c && !sameEntry(old, c))) c._ts = now
  }
  return next
}

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
