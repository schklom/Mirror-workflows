import { EXIDX } from './exercises.js'
import { MUSCLES, musclesOf } from './muscles.js'
import { isWarmupRow, dropsOf } from './workout-model.js'

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

// One session's per-muscle stimulus in effective hard sets, calculated only from
// that session. Every completed set counts (warm-ups included: mechanical work is
// mechanical work); drop-set drops count as extra sets; rest-pause `clusters`
// are NOT extra because the row's own set already totals every burst
// (see applyIntensifierPlan/history.js). Cardio/timed rows count as sets too.
// Within an entry each set is scaled by its load relative to that entry's own
// best in the session: a ramp-up row at half the top weight costs ~(0.5)^1.5 of
// a set, so warm-ups and back-offs no longer fatigue like work sets. The ratio
// is unit-free, so kg/lb histories score identically, and zero-load sets (rings,
// imports without loads) count full - assuming hard when intensity is unknown.
// Absolute loads across sessions are deliberately NOT compared here: without
// proximity-to-failure data a lighter session may still be the harder one, and
// cross-session load sensitivity belongs to the chronic denominator (phase 2).
function sessionSets(workout) {
  const sums = emptyMuscleMap(0)
  for (const entry of workout?.entries || []) {
    const ex = exerciseFor(entry)
    const weights = musclesOf(ex)
    const loads = (entry.sets || []).map(set => Math.max(0, numeric(set?.w) ?? 0))
    const best = Math.max(0, ...loads)
    for (const set of entry.sets || []) {
      if (set?.done !== true) continue
      const load = Math.max(0, numeric(set?.w) ?? 0)
      const intensity = best > 0 && load > 0 ? (Math.min(1, load / best)) ** 1.5 : 1
      const count = intensity
      for (const [slug, weight] of Object.entries(weights)) {
        if (Object.prototype.hasOwnProperty.call(MUSCLES_BY_SLUG, slug)) sums[slug] += count * weight
      }
    }
    // Drop-set drops carry their own (usually lighter) load, scored against the
    // same entry best - extra work at a discount, never double-counted.
    for (const set of entry.sets || []) {
      if (set?.done !== true) continue
      for (const drop of dropsOf(set)) {
        const load = Math.max(0, numeric(drop?.w) ?? 0)
        const intensity = best > 0 && load > 0 ? (Math.min(1, load / best)) ** 1.5 : 1
        for (const [slug, weight] of Object.entries(weights)) {
          if (Object.prototype.hasOwnProperty.call(MUSCLES_BY_SLUG, slug)) sums[slug] += intensity * weight
        }
      }
    }
  }
  for (const slug of MUSCLES) sums[slug] = Math.min(sums[slug], FATIGUE_MAX_SETS_PER_SESSION)
  return sums
}

// Build normalised stimuli in workout order. Each session is scored only from
// its own sets against the fixed full-session unit, so a session can never
// dilute its own score and stimuli stay non-negative and causal: removing any
// workout can only remove stimulus, so deletion can never increase fatigue.
// Rebuilding from the bounded scan also makes imports older than the scan
// exactly irrelevant.
function fatigueStimuli(workouts, current) {
  const cutoff = current - FATIGUE_SCAN_MS
  const ordered = (workouts || [])
    .map((workout, index) => ({ workout, index, timestamp: workoutTimestamp(workout) }))
    .filter(item => Number.isFinite(item.timestamp) && item.timestamp > cutoff)
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
  const byMuscle = Object.fromEntries(MUSCLES.map(slug => [slug, []]))

  for (const { workout, timestamp } of ordered) {
    const sums = sessionSets(workout)
    for (const slug of MUSCLES) {
      const stimulus = sums[slug]
      if (!(stimulus > 0)) continue
      byMuscle[slug].push({ slug, timestamp, stimulus: stimulus / FATIGUE_SETS_PER_UNIT })
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
 * set contributes the exercise's `musclesOf` weights in effective-set units (a full session of
 * ~8 hard sets scores 1.0); the scan is bounded to FATIGUE_SCAN_MS for performance, not
 * semantics. Stimuli accumulate chronologically with a per-muscle half-life (24h arms/small,
 * 30h torso, 48h legs/lower-back), decayed to `now`, and normalised with the saturation curve
 * 1 - exp(-v). Each session is scored only from its own sets, so out-of-window imports are
 * irrelevant and deleting a workout can only remove stimulus.
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
  const byMuscle = fatigueStimuli(workouts, current)
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
