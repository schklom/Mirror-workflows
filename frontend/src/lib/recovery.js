import { EXIDX, isAssisted } from './exercises.js'
import { MUSCLES, musclesOf } from './muscles.js'
import { isWarmupRow, dropsOf, isSideSet } from './workout-model.js'
import { estimate1RM, REP_CAP } from './onerm.js'
import { rirOf, HARD_RIR } from './effort.js'

// Fatigue stimulus in effective hard sets, not tonnage: hypertrophy dose-response
// tracks sets near failure (~5-30 reps), while tonnage overweights heavy compounds
// (a 250x7 leg press counts ~50x a 5x12 fly for a comparable growth stimulus).
// One full session on a muscle (~8 hard sets, the per-session growth plateau)
// scores 1.0 raw unit; secondary movers count 0.4 via musclesOf weights.
export const FATIGUE_SETS_PER_UNIT = 8
// Per-session cap per muscle: beyond ~10-12 sets the growth response plateaus,
// so extra junk volume must not extend the red tail linearly.
export const FATIGUE_MAX_SETS_PER_SESSION = 12
// Computational bound for the stimulus scan, not a semantic cliff: after 30 days
// even a 24h half-life muscle retains below 1e-9 of the stimulus.
export const FATIGUE_SCAN_MS = 30 * 24 * 60 * 60 * 1000
// Capacity anchors and chronic exposure look further back than the stimulus scan:
// a 90-day rolling best still knows the lifter's recent strength, and 28 days of
// exposure is the chronic side of the acute:chronic pair. Sessions older than the
// stimulus scan never emit stimulus themselves - they only inform these two.
export const FATIGUE_RIR_WINDOW_MS = 90 * 24 * 60 * 60 * 1000
export const FATIGUE_ACUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const FATIGUE_CHRONIC_WINDOW_MS = 28 * 24 * 60 * 60 * 1000
// A far-from-failure set still moves blood and practices the lift: it costs no less
// than this fraction of a hard set.
export const FATIGUE_RIR_FLOOR_WEIGHT = 0.3
// The acute:chronic gain is clamped: doubling volume at most doubles the scored
// stimulus, halving at most halves it. Maintenance (~1.0) reproduces phase-1 values.
export const FATIGUE_RATIO_MIN = 0.5
export const FATIGUE_RATIO_MAX = 2
// Prior weekly exposure for a muscle never trained in the chronic window: the novice
// anchor. A first session therefore scores amplified (unadapted), a maintained
// veteran scores ~1.0 (adapted) - the repeated-bout effect as arithmetic.
export const FATIGUE_NOVICE_WEEKLY_SETS = 4

// Exponential half-life for fatigue stimulus, per muscle. Lower body (heavier
// absolute loads, more damage) recovers slower than upper body: 10RM
// reproducibility data shows squat still down -6.6% at 36h while bench is -3.0%,
// both fully back by 48-72h. Small/core muscles share the fast 24h lane.
const FATIGUE_HL_24H = 24 * 60 * 60 * 1000
const FATIGUE_HL_30H = 30 * 60 * 60 * 1000
const FATIGUE_HL_48H = 48 * 60 * 60 * 1000
const FATIGUE_HL_BY_MUSCLE = {
  trapezius: FATIGUE_HL_30H, deltoids: FATIGUE_HL_24H, chest: FATIGUE_HL_30H,
  'upper-back': FATIGUE_HL_30H, serratus: FATIGUE_HL_24H,
  biceps: FATIGUE_HL_24H, triceps: FATIGUE_HL_24H, forearm: FATIGUE_HL_24H,
  abs: FATIGUE_HL_24H, obliques: FATIGUE_HL_24H, 'lower-back': FATIGUE_HL_48H,
  gluteal: FATIGUE_HL_48H, quadriceps: FATIGUE_HL_48H, hamstring: FATIGUE_HL_48H,
  adductors: FATIGUE_HL_48H, 'hip-flexors': FATIGUE_HL_24H,
  calves: FATIGUE_HL_48H, tibialis: FATIGUE_HL_24H,
}

/** Exponential half-life for fatigue stimulus of one muscle. */
export function fatigueHalfLifeOf(slug) {
  return FATIGUE_HL_BY_MUSCLE[slug] || FATIGUE_HL_30H
}

/** Period after training during which retained strength remains at full value. */
export const STRENGTH_FULL_MS = 1209600000

/** Exponential half-life for retained strength after the full-retention period. */
export const STRENGTH_HALF_LIFE_MS = 2419200000

/** Minimum retained-strength value for an untrained or fully detrained muscle. */
export const STRENGTH_FLOOR = 0.5

/**
 * Stable labels for consumer fatigue buckets: values below 0.25 are ready, values from 0.25
 * through 0.5 are recovering, and values above 0.5 are fatigued.
 */
export const FATIGUE_STATES = Object.freeze({
  READY: 'ready',
  RECOVERING: 'recovering',
  FATIGUED: 'fatigued',
})

/**
 * Return exponential decay expressed as a fraction of one half-life.
 *
 * @param {number} ageMs Elapsed age of the stimulus in milliseconds.
 * @param {number} halfLifeMs Duration of one half-life in milliseconds.
 * @returns {number} Remaining fraction, using the exact `0.5 ** (age / halfLife)` formula.
 */
export function halfLifeDecay(ageMs, halfLifeMs) {
  return 0.5 ** (ageMs / halfLifeMs)
}

// The v2 data contract has one timestamp per workout, not per set. Keep this fallback in one
// place so fatigue and strength use exactly the same stimulus time as effort.js.
function workoutTimestamp(workout) {
  const timestamp = workout?.start || new Date(workout?.d).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number(timestamp)
}

function emptyMuscleMap(value) {
  return Object.fromEntries(MUSCLES.map(slug => [slug, value]))
}

// Current catalogue metadata stays authoritative. Finished entries retain a nested muscle
// snapshot specifically so deleted custom exercises can still contribute to recovery maps.
function exerciseFor(entry) {
  return EXIDX[entry?.id] || entry
}

export const LB_TO_KG = 0.45359237

function numeric(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// Unit stamps live on the set, the target, the entry, or the workout; profile unit
// comes through opts. The anchor compares loads across sessions (and mixed-unit
// imports alternate kg/lb rows), so every load is canonicalised to kg first -
// 176 lb must anchor like 80 kg, not like 176 kg.
function unitOf(...records) {
  for (const record of records) {
    if (!record || typeof record !== 'object') continue
    for (const key of ['unit', 'u', 'weightUnit', 'weight_unit', 'loadUnit']) {
      if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') return record[key]
    }
  }
  return 'kg'
}

function isPounds(unit) {
  return /^(?:lb|lbs|pound|pounds)$/i.test(String(unit ?? '').trim())
}

function kgOf(value, unit) {
  const n = numeric(value)
  if (n === null) return 0
  return Math.max(0, n) * (isPounds(unit) ? LB_TO_KG : 1)
}

function rowWkg(row, set, entry, workout, opts) {
  return kgOf(row?.w, unitOf(row, set, entry?.target, entry, workout, opts))
}

/**
 * How much of a hard set a proximity-to-failure reading is worth. Logged effort
 * (`rir`/`rpe` via effort.js) always wins; otherwise the RIR is estimated against
 * the exercise's 90-day rolling best (see `estimateSetRir`). At or near failure a
 * set counts full, far from it no less than the floor: easy work still moves blood.
 *
 * @param {number|null} rir Reps in reserve, or null when intensity is unknown.
 * @returns {number} Set weight in [0.3, 1].
 */
export function rirWeightFor(rir) {
  if (rir == null) return 1
  if (rir <= HARD_RIR) return 1
  if (rir >= 6) return FATIGUE_RIR_FLOOR_WEIGHT
  return 1 - (1 - FATIGUE_RIR_FLOOR_WEIGHT) * (rir - HARD_RIR) / (6 - HARD_RIR)
}

/**
 * Estimate a set's reps in reserve from a capacity anchor (Epley inverse, both in
 * kg so mixed-unit histories anchor correctly). The anchor is the exercise's recent
 * best 1RM estimate, so `80x8` against a 110 max reads ~RIR 3 while the same set
 * against a 100 max reads failure. Returns null wherever an honest answer is
 * impossible: no anchor, no load, no reps, or above the rep cap (where estimators
 * diverge past 10%).
 *
 * @param {{w?: number, r?: number}} set A completed set with load and reps.
 * @param {number|null} anchorKg Recent best 1RM estimate for the exercise, in kg.
 * @returns {{rir: number, source: 'estimated'}|null} Clamped RIR in [0, 10].
 */
export function estimateSetRir(set, anchorKg, unit) {
  const w = numeric(set?.w)
  const r = numeric(set?.r)
  if (!(anchorKg > 0) || !(w > 0) || !(r >= 1) || r > REP_CAP) return null
  const wKg = kgOf(w, unit ?? set?.unit)
  if (!(wKg > 0)) return null
  const maxReps = 30 * (anchorKg / wKg - 1)
  const rir = Math.min(10, Math.max(0, maxReps - r))
  return { rir, source: 'estimated' }
}

// One session's per-muscle stimulus in quality-weighted effective sets. Every
// completed set counts (warm-ups included: mechanical work is mechanical work);
// drop-set drops count as extra sets; rest-pause `clusters` are NOT extra because
// the row's own set already totals every burst (see applyIntensifierPlan/history.js).
// Cardio/timed rows count as sets too. Each set is scaled by its RIR weight -
// logged effort first, Epley-inverse estimate against the anchor second, full
// credit when intensity is unknowable (rings, load-less imports). Anchors come
// from the 90-day window ending at this session, never from its future.
function sessionEffSets(workout, anchors, opts = {}) {
  const sums = emptyMuscleMap(0)
  const score = (row, set, entry, weights, anchorKg, requireDone = true) => {
    if (requireDone && row?.done !== true) return
    const unit = unitOf(row, set, entry?.target, entry, workout, opts)
    const logged = rirOf(row)
    const estimated = logged == null ? estimateSetRir(row, anchorKg, unit) : null
    const count = rirWeightFor(logged ?? estimated?.rir)
    for (const [slug, weight] of Object.entries(weights)) {
      if (Object.prototype.hasOwnProperty.call(MUSCLES_BY_SLUG, slug)) sums[slug] += count * weight
    }
  }
  for (const entry of workout?.entries || []) {
    const ex = exerciseFor(entry)
    const weights = musclesOf(ex)
    const anchorKg = anchors?.get(entry.id)
    for (const set of entry.sets || []) {
      score(set, set, entry, weights, anchorKg)
      // Drop-set drops carry their own load against the same anchor - extra work at
      // a discount, never double-counted. Drops carry no done flag of their own;
      // performed as part of a done set, they count unconditionally.
      if (set?.done === true) for (const drop of dropsOf(set)) score(drop, set, entry, weights, anchorKg, false)
    }
  }
  for (const slug of MUSCLES) sums[slug] = Math.min(sums[slug], FATIGUE_MAX_SETS_PER_SESSION)
  return sums
}

// Best Epley estimate per exercise inside one session, in kg. Session-local, so a
// 90-day-old import can never reweight today's anchor - only sessions inside the
// anchor window ending at the scored session contribute. Assistance work has no
// 1RM (the load is help received) and stays out, matching onerm.js.
function sessionBests(workout, opts = {}) {
  const best = new Map()
  const consider = (row, set, entry, exId) => {
    if (row?.done !== true) return
    const sides = isSideSet(row) ? [row.sides.L, row.sides.R].filter(s => s?.done === true) : [row]
    for (const side of sides) {
      const est = estimate1RM(rowWkg(side, set, entry, workout, opts), numeric(side?.r))
      if (est !== null && (!best.has(exId) || est > best.get(exId))) best.set(exId, est)
    }
  }
  for (const entry of workout?.entries || []) {
    if (isAssisted(entry?.id ? { id: entry.id } : entry)) continue
    for (const set of entry.sets || []) consider(set, set, entry, entry.id)
  }
  return best
}

// Build normalised stimuli in workout order. Each session is scored from its own
// quality-weighted sets against the fixed full-session unit, multiplied by the
// acute:chronic gain left by strictly earlier exposure: a session that doubles the
// recent weekly rate scores up to twice, a deload down to half, maintenance
// reproduces phase-1 values. Stimuli stay non-negative and every window is
// causal, so rest still never increases fatigue and out-of-scan imports stay
// irrelevant - but deleting a mid-history workout can now re-score later sessions
// through their anchors and gains (adaptation is history-dependent by design).
// Deleting the latest session still never increases anything: earlier windows end
// before it.
function fatigueStimuli(workouts, current, opts = {}) {
  const scanCutoff = current - FATIGUE_SCAN_MS
  // The pool covers every window a scored session can read: its anchor reaches 90d
  // back from its own timestamp, and the oldest scored session is 30d old, so the
  // pool spans 120d. Narrower would let sessions age out of anchors as `now' advances
  // and fatigue would rise during rest.
  const poolCutoff = current - (FATIGUE_SCAN_MS + FATIGUE_RIR_WINDOW_MS)
  const pool = (workouts || [])
    .map((workout, index) => ({ workout, index, timestamp: workoutTimestamp(workout) }))
    .filter(item => Number.isFinite(item.timestamp) && item.timestamp > poolCutoff)
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
  const scored = pool.filter(item => item.timestamp > scanCutoff)
  const bests = pool.map(item => sessionBests(item.workout, opts))
  const effSets = pool.map((item, i) => {
    const anchors = new Map()
    for (let j = 0; j <= i; j += 1) {
      if (pool[j].timestamp <= item.timestamp - FATIGUE_RIR_WINDOW_MS) continue
      for (const [exId, est] of bests[j]) {
        if (!anchors.has(exId) || est > anchors.get(exId)) anchors.set(exId, est)
      }
    }
    return sessionEffSets(item.workout, anchors, opts)
  })
  const byMuscle = Object.fromEntries(MUSCLES.map(slug => [slug, []]))

  for (const item of scored) {
    const i = pool.indexOf(item)
    const acute = emptyMuscleMap(0)
    const chronic = emptyMuscleMap(0)
    for (let j = 0; j <= i; j += 1) {
      const age = item.timestamp - pool[j].timestamp
      if (age < 0 || age > FATIGUE_CHRONIC_WINDOW_MS) continue
      for (const slug of MUSCLES) {
        if (age <= FATIGUE_ACUTE_WINDOW_MS) acute[slug] += effSets[j][slug]
        chronic[slug] += effSets[j][slug]
      }
    }
    for (const slug of MUSCLES) {
      const stimulus = effSets[i][slug]
      if (!(stimulus > 0)) continue
      const gain = Math.min(
        FATIGUE_RATIO_MAX,
        Math.max(
          FATIGUE_RATIO_MIN,
          (acute[slug] + FATIGUE_NOVICE_WEEKLY_SETS) / (chronic[slug] / 4 + FATIGUE_NOVICE_WEEKLY_SETS),
        ),
      )
      byMuscle[slug].push({ slug, timestamp: item.timestamp, stimulus: stimulus / FATIGUE_SETS_PER_UNIT * gain })
    }
  }
  return byMuscle
}

const MUSCLES_BY_SLUG = Object.fromEntries(MUSCLES.map(slug => [slug, true]))

function fatigueValue(events, now, slug) {
  if (!events.length) return 0
  const halfLife = fatigueHalfLifeOf(slug)
  events.sort((a, b) => a.timestamp - b.timestamp)

  let value = 0
  let lastTimestamp = events[0].timestamp
  for (const event of events) {
    value *= halfLifeDecay(event.timestamp - lastTimestamp, halfLife)
    value += event.stimulus
    lastTimestamp = event.timestamp
  }
  value *= halfLifeDecay(Math.max(0, now - lastTimestamp), halfLife)
  // Normalise the accumulated stimulus to a saturating fatigue level: more sets start
  // higher but never pin, and the value fades asymptotically - no window-edge cliff.
  return 1 - Math.exp(-value)
}

/**
 * Calculate current per-muscle fatigue from completed sets in the recent window.
 *
 * Stimulus time is `workout.start`, falling back to the workout date `workout.d`. Each completed
 * set contributes the exercise's `musclesOf` weights in quality-weighted effective-set units
 * (logged RIR first, Epley-inverse estimate against the 90-day rolling best second, full
 * credit when intensity is unknowable); a full session of ~8 hard sets scores 1.0, scaled by
 * the acute:chronic gain (recent weekly rate vs 28-day exposure, novice prior of 4 sets/week,
 * clamped 0.5-2). The scan is bounded to FATIGUE_SCAN_MS for performance, not semantics.
 * Stimuli accumulate chronologically with a per-muscle half-life (24h arms/small,
 * 30h torso, 48h legs/lower-back), decayed to `now`, and normalised with the saturation curve
 * 1 - exp(-v). Every window is causal, so rest never increases fatigue and out-of-window
 * imports stay irrelevant; deleting the latest session never increases anything, while
 * deleting mid-history may re-score later sessions through their anchors and gains.
 * The result always contains every drawable muscle slug.
 *
 * @param {Array<object>} workouts Workout history with `start`/`d` and entry set arrays.
 * @param {number} now Current time in milliseconds; injected to keep this function deterministic.
 * @param {{unit?: string}} options Reserved profile-level options; unit is supplied at the UI boundary.
 * @returns {Record<string, number>} Fatigue values keyed by every drawable muscle slug.
 */
export function fatigueOf(workouts, now, opts = {}) {
  const current = Number(now)
  const result = emptyMuscleMap(0)
  if (!Number.isFinite(current)) return result
  const byMuscle = fatigueStimuli(workouts, current, opts)
  for (const slug of MUSCLES) result[slug] = fatigueValue(byMuscle[slug], current, slug)
  return result
}

/**
 * Calculate retained per-muscle strength from the latest completed stimulus in all history.
 *
 * A muscle with no completed set starts at the 0.5 floor. After a completed set, strength is
 * 1.0 through 14 days old, then decays toward the floor with a 28-day half-life. Any later
 * completed set becomes the new latest stimulus and resets the 14-day full-retention period.
 * The result always contains every drawable muscle slug.
 *
 * @param {Array<object>} workouts Workout history with `start`/`d` and entry set arrays.
 * @param {number} now Current time in milliseconds; injected to keep this function deterministic.
 * @returns {Record<string, number>} Retained-strength values keyed by every drawable muscle slug.
 */
export function strengthOf(workouts, now, opts = {}) {
  const current = Number(now)
  const latest = Object.fromEntries(MUSCLES.map(slug => [slug, -Infinity]))
  for (const workout of workouts || []) {
    const timestamp = workoutTimestamp(workout)
    if (!Number.isFinite(timestamp)) continue
    for (const entry of workout.entries || []) {
      if (!(entry.sets || []).some(set => set?.done === true && !isWarmupRow(set))) continue
      for (const slug of Object.keys(musclesOf(exerciseFor(entry)))) {
        if (Object.prototype.hasOwnProperty.call(MUSCLES_BY_SLUG, slug) && timestamp > latest[slug]) {
          latest[slug] = timestamp
        }
      }
    }
  }

  const result = emptyMuscleMap(STRENGTH_FLOOR)
  if (!Number.isFinite(current)) return result
  for (const slug of MUSCLES) {
    const lastTimestamp = latest[slug]
    if (!Number.isFinite(lastTimestamp)) continue
    const age = current - lastTimestamp
    if (age <= STRENGTH_FULL_MS) {
      result[slug] = 1
    } else {
      result[slug] = Math.max(
        STRENGTH_FLOOR,
        halfLifeDecay(age - STRENGTH_FULL_MS, STRENGTH_HALF_LIFE_MS),
      )
    }
  }
  return result
}

/**
 * List muscles currently above the fatigued threshold.
 *
 * @param {Array<object>} workouts Workout history passed to {@link fatigueOf}.
 * @param {number} now Current time in milliseconds passed to {@link fatigueOf}.
 * @returns {string[]} Muscle slugs whose fatigue value is greater than 0.5, in `MUSCLES`
 * head-to-toe order.
 * @example
 * const avoid = fatiguedMuscles(workouts, now)
 */
export function fatiguedMuscles(workouts, now, opts = {}) {
  return Object.entries(fatigueOf(workouts, now, opts))
    .filter(([, value]) => value > 0.5)
    .map(([slug]) => slug)
}

/**
 * List muscles whose retained strength is below full retention.
 *
 * @param {Array<object>} workouts Workout history passed to {@link strengthOf}.
 * @param {number} now Current time in milliseconds passed to {@link strengthOf}.
 * @returns {string[]} Muscle slugs whose retained strength is less than 1.0, in `MUSCLES`
 * head-to-toe order; never-trained muscles are included at the 0.5 floor.
 * @example
 * const targets = detrainedMuscles(workouts, now)
 */
export function detrainedMuscles(workouts, now, opts = {}) {
  return Object.entries(strengthOf(workouts, now, opts))
    .filter(([, value]) => value < 1)
    .map(([slug]) => slug)
}
