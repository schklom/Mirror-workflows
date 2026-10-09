// Dumbbells and kettlebells: what a logged weight means (issue #474).
//
// A dumbbell bench press logged at 20 kg can mean one 20 kg bell in each hand or two 10s. The
// app never asked, and everything that reads weights took the number at face value: volume is
// weight × reps, the 1RM is estimated from it, records and progression compare it as it stands.
// So the default, 'as', is exactly that and nothing more: "as entered", counted once, the way
// every set logged before this file existed was counted. Nothing in history is reinterpreted.
//
// An exercise can say what it means instead:
//   'each'  — the weight of one bell. Volume counts both (× 2), unless the exercise is done one
//             arm at a time (per side, or "one arm" / "single arm" in its name): then one bell
//             is all there is, and it counts once.
//   'total' — both bells together. Counted once, as today; the label says so.
// The choice lives on the routine's exercise (cfg.dbLoad, routine-specific) or as the exercise's
// own default (S.dbLoad[exId] = { mode, _ts }, stamped like S.loadKind so a sync keeps the last
// choice). A session stamps the meaning it was logged with on the entry's target, so changing
// the setting later applies from then on and never rewrites what a past set meant.
//
// Records, the 1RM and progression compare like with like: a session logged as 'total' read by
// an exercise that is now 'each' is halved first (and the other way round). Sets logged as
// entered are never converted — nothing says which they meant — so they compare as they always
// did.
//
// Only lib/exercises.js is imported, so history.js, progression.js and plates.js can all use
// this file without a cycle.

import { EXIDX } from './exercises.js'

const exOf = exOrId => (typeof exOrId === 'string' ? EXIDX[exOrId] : exOrId)
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const tidy = w => Math.round(w * 1000) / 1000

/** Equipment you hold one of in each hand. */
export const BELL_EQ = new Set(['dumbbell', 'kettlebell'])
/** Whether the meaning of the weight is worth asking about for this exercise (object or id). */
export const isBellEx = exOrId => BELL_EQ.has(exOf(exOrId)?.eq)

/** A stored meaning ('as' | 'each' | 'total'), or null when there is none. S.dbLoad holds `{ mode, _ts }`. */
export function dbLoadOf(value) {
  const m = isMap(value) ? value.mode : value
  return m === 'each' || m === 'total' || m === 'as' ? m : null
}

/**
 * What a weight means for this exercise right now: the routine's own choice (cfg.dbLoad), else
 * the exercise's default (S.dbLoad), else 'as' (as entered, today's behaviour).
 */
export function dbLoadFor(S, cfgOrId) {
  const cfg = typeof cfgOrId === 'string' ? { id: cfgOrId } : (cfgOrId || {})
  return dbLoadOf(cfg.dbLoad) || dbLoadOf(S?.dbLoad?.[cfg.id]) || 'as'
}

/**
 * S.dbLoad with the exercise's default set to `mode`. Going back to "as entered" is a stamped
 * null rather than a deleted key, so it wins a sync against the other device's older choice.
 */
export const withDbLoad = (map, exId, mode, now = Date.now()) =>
  ({ ...(isMap(map) ? map : {}), [exId]: { mode: mode === 'each' || mode === 'total' ? mode : null, _ts: now } })

// One arm at a time means one bell, whatever the setting says. "Alternating" curls still hold
// two, so only the words that say a single arm or hand count.
const ONE_ARM = /\b(one|single)[- ]?(arm|hand|handed)\b/i

/** Whether this exercise uses a single bell: logged per side, or named one-arm. */
export const isOneArm = cfg => !!cfg?.side || ONE_ARM.test(exOf(cfg?.id)?.n || '')
/** How many bells are lifted at once: 1 for one-arm work, else 2. */
export const bellsIn = cfg => (isOneArm(cfg) ? 1 : 2)

/**
 * A freestyle entry's target with the meaning it is logged in stamped on it, as buildPlannedEntry
 * stamps a planned one: `cfg` as it is when the exercise is "as entered".
 */
export function withMeaning(S, cfg, id = cfg?.id) {
  const m = dbLoadFor(S, { ...(cfg || {}), id })
  return m === 'as' ? { ...cfg } : { ...cfg, dbLoad: m }
}

/** The meaning a logged entry was saved with: its target's stamp, 'as' when it has none. */
export const entryDbLoad = entry => dbLoadOf(entry?.target?.dbLoad) || 'as'
const cfgOfEntry = entry => ({ ...(entry?.target || {}), id: entry?.id })

/** What one logged kilo of this entry is worth in volume: 2 for "each" on two bells, else 1. */
export const volumeFactor = entry =>
  (entryDbLoad(entry) === 'each' ? bellsIn(cfgOfEntry(entry)) : 1)

/**
 * The factor that turns a weight meant as `from` into the same load meant as `to`. Only the two
 * explicit meanings convert; "as entered" is taken at face value both ways, and a one-arm
 * exercise has one bell, so each and total are the same number there.
 */
export function meaningFactor(from, to, cfg) {
  if (from === to || from === 'as' || to === 'as' || !from || !to) return 1
  const n = bellsIn(cfg)
  if (n === 1) return 1
  return from === 'each' ? n : 1 / n
}

const scaleRow = (row, f) => {
  if (!isMap(row)) return row
  const out = { ...row }
  if (Number.isFinite(Number(row.w)) && row.w != null) out.w = tidy(Number(row.w) * f)
  if (Array.isArray(row.drops)) out.drops = row.drops.map(d => (isMap(d) ? { ...d, w: tidy((Number(d.w) || 0) * f) } : d))
  if (isMap(row.sides)) out.sides = Object.fromEntries(Object.entries(row.sides).map(([k, s]) => [k, scaleRow(s, f)]))
  return out
}

/**
 * The entry with its weights read as `to`: a scaled copy when the meanings differ (see
 * meaningFactor), the entry itself otherwise. For comparing, never for storing.
 */
export function entryAs(entry, to) {
  const from = entryDbLoad(entry)
  const f = meaningFactor(from, to, cfgOfEntry(entry))
  if (f === 1) return entry
  const out = { ...entry, target: { ...(entry.target || {}), dbLoad: to }, sets: (entry.sets || []).map(s => scaleRow(s, f)) }
  if (Number(entry.topW) > 0) out.topW = tidy(entry.topW * f)
  return out
}

/** A workout with every entry of `exId` read as `to` (entryAs); the workout itself when nothing changes. */
export function workoutAs(w, exId, to) {
  if (!to || to === 'as' || !Array.isArray(w?.entries)) return w
  let changed = false
  const entries = w.entries.map(e => {
    if (e?.id !== exId) return e
    const next = entryAs(e, to)
    if (next !== e) changed = true
    return next
  })
  return changed ? { ...w, entries } : w
}

/**
 * The state with one exercise's history read as `to`, for the readers that compare it: records,
 * the 1RM, the progression that builds today's rows. The state itself when nothing converts,
 * which is always the case for an exercise that never chose a meaning.
 */
export function historyAs(S, exId, to) {
  if (!S || !to || to === 'as' || !Array.isArray(S.workouts)) return S
  let changed = false
  const workouts = S.workouts.map(w => {
    const next = workoutAs(w, exId, to)
    if (next !== w) changed = true
    return next
  })
  return changed ? { ...S, workouts } : S
}

/**
 * The meaning an exercise's history is read in when no session is asking: the exercise's own
 * default, else the meaning it was last logged with, else 'as'.
 */
export function currentDbLoad(S, exId) {
  const own = dbLoadOf(S?.dbLoad?.[exId])
  if (own) return own
  const ws = Array.isArray(S?.workouts) ? S.workouts : []
  for (let i = ws.length - 1; i >= 0; i--) {
    const list = Array.isArray(ws[i]?.entries) ? ws[i].entries : []
    for (let j = list.length - 1; j >= 0; j--) if (list[j]?.id === exId && list[j]?.target?.dbLoad) return entryDbLoad(list[j])
  }
  return 'as'
}
