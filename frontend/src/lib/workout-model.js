// Focused workout semantics shared by session, history, and strength views.
// Legacy records have no explicit phase or mode, so the defaults preserve main's work/reps shape.

const MODES = ['reps', 'time', 'cardio']
const objectOf = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}

function normalizedPhase(value, fallback = 'work') {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (token === 'warmup' || token === 'warm-up' || token === 'warm_up') return 'warmup'
  if (token === 'work') return 'work'
  return fallback === 'warmup' ? 'warmup' : 'work'
}

/** Resolve a row's phase. An explicit phase wins over the legacy warmup boolean. */
export function phaseForSet(set, fallback = 'work') {
  const source = objectOf(set)
  if (source.phase != null && source.phase !== '') return normalizedPhase(source.phase, fallback)
  return source.warmup === true ? 'warmup' : normalizedPhase(undefined, fallback)
}

export function isWarmupRow(set) {
  return phaseForSet(set) === 'warmup'
}

// A row's shape beyond warm-up/work: 'straight' (default), 'dropset' (a main set followed by
// weight drops logged with no rest) or 'restpause' (an activation set followed by short-rest
// bursts). Both extras ride on the row itself — same card, not a new set in the array — the
// same trick `phase` uses for warm-ups, so the rest of the app can keep reading a row's own
// `w`/`r` and stay correct without knowing this field exists.
export function setType(set) {
  const source = objectOf(set)
  return source.type === 'dropset' || source.type === 'restpause' ? source.type : 'straight'
}
export const isDropSet = set => setType(set) === 'dropset'
export const isRestPauseSet = set => setType(set) === 'restpause'

/** A drop-set's weight drops, oldest first; empty for anything else. */
export function dropsOf(set) {
  const source = objectOf(set)
  return isDropSet(source) && Array.isArray(source.drops) ? source.drops : []
}

/** A rest-pause set's short-rest bursts, oldest first; empty for anything else. */
export function clustersOf(set) {
  const source = objectOf(set)
  return isRestPauseSet(source) && Array.isArray(source.clusters) ? source.clusters : []
}

/**
 * Weight x reps from a drop-set's drops, on top of its own main set. The 1RM estimate and the
 * progression engine deliberately read only a row's own `w`/`r` (the heaviest effort), so this
 * is the one place a drop-set's extra volume gets added back in for totals.
 *
 * A rest-pause row is different: its own `r` IS the total (every burst's reps included), and
 * `clusters` is only how that total breaks down — not extra volume on top of it. Adding
 * `clustersOf(set)` here as well would double-count the same reps twice.
 */
export function extraVolumeOf(set) {
  const drops = dropsOf(set)
  return drops.reduce((v, d) => v + (Number(d?.w) || 0) * (Number(d?.r) || 0), 0)
}

/** Append a weight drop to a row, marking it a drop-set. */
export function addDrop(set, drop) {
  const prev = Array.isArray(objectOf(set).drops) ? objectOf(set).drops : []
  return { ...objectOf(set), type: 'dropset', drops: [...prev, { w: Number(drop?.w) || 0, r: Number(drop?.r) || 0 }] }
}

/** Append a short-rest burst to a row, marking it a rest-pause set. */
export function addCluster(set, cluster) {
  const prev = Array.isArray(objectOf(set).clusters) ? objectOf(set).clusters : []
  return { ...objectOf(set), type: 'restpause', clusters: [...prev, { r: Number(cluster?.r) || 0, restSec: Number(cluster?.restSec) || 0 }] }
}

/** Remove one drop by index. Clearing the last one reverts the row to a straight set. */
export function removeDropAt(set, i) {
  const drops = (objectOf(set).drops || []).filter((_, idx) => idx !== i)
  return drops.length ? { ...objectOf(set), drops } : { ...objectOf(set), type: 'straight', drops }
}

/** Remove one burst by index. Clearing the last one reverts the row to a straight set. */
export function removeClusterAt(set, i) {
  const clusters = (objectOf(set).clusters || []).filter((_, idx) => idx !== i)
  return clusters.length ? { ...objectOf(set), clusters } : { ...objectOf(set), type: 'straight', clusters }
}

/** Patch one drop's fields in place (weight/reps steppers edit an existing drop). */
export function setDropAt(set, i, patch) {
  const drops = (objectOf(set).drops || []).slice()
  if (!drops[i]) return set
  drops[i] = { ...drops[i], ...patch }
  return { ...objectOf(set), drops }
}

/** Patch one burst's fields in place (a reps stepper edits an existing burst). */
export function setClusterAt(set, i, patch) {
  const clusters = (objectOf(set).clusters || []).slice()
  if (!clusters[i]) return set
  clusters[i] = { ...clusters[i], ...patch }
  return { ...objectOf(set), clusters }
}

/** Suggested weight for the next drop: pct% lighter than the previous weight, rounded to .5. */
export function nextDropWeight(prevWeight, pct = 20) {
  const p = Math.min(90, Math.max(1, Number(pct) || 20))
  return Math.round(Math.max(0, (Number(prevWeight) || 0) * (1 - p / 100)) * 2) / 2
}

/** Suggested reps for the next rest-pause burst: roughly half the previous rep count. */
export function nextBurstReps(prevReps) {
  return Math.max(1, Math.round((Number(prevReps) || 0) / 2))
}

/**
 * Split a rest-pause total (the extra reps you want past the activation set) into a descending,
 * roughly-halving sequence of bursts that adds back up to it — e.g. 12 -> [6, 3, 2, 1]. This is
 * what a planned rest-pause exercise configures directly, rather than a burst count picked by
 * hand: you say how many reps you want out of the whole rest-pause portion, not how many rests.
 */
export function splitBurstReps(total) {
  const bursts = []
  let remaining = Math.max(0, Math.round(Number(total) || 0))
  while (remaining > 0) {
    const burst = Math.min(remaining, nextBurstReps(remaining))
    bursts.push(burst)
    remaining -= burst
  }
  return bursts
}

export function normalizeMode(value, fallback = 'reps') {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (MODES.includes(token)) return token
  return MODES.includes(fallback) ? fallback : 'reps'
}

function modeFromUnit(value) {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (['rep', 'reps', 'repetition', 'repetitions'].includes(token)) return 'reps'
  if (['sec', 'secs', 'second', 'seconds'].includes(token)) return 'time'
  if (['min', 'mins', 'minute', 'minutes'].includes(token)) return 'cardio'
  return null
}

function explicitMode(source) {
  const value = objectOf(source).mode
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return MODES.includes(token) ? token : modeFromUnit(objectOf(source).unit)
}

function inferredMode(source) {
  const value = objectOf(source)
  const explicit = explicitMode(value)
  if (explicit) return explicit
  if (String(value.mode || '').trim().toLowerCase() === 'amrap') return 'reps'
  if (value.min != null || value.speed != null) return 'cardio'
  if (value.sec != null || value.seconds != null || value.durationSec != null) return 'time'
  if (value.r != null || value.reps != null || value.actualReps != null) return 'reps'
  return null
}

/** Resolve one row's mode: explicit row, parent target, then legacy result fields. */
export function modeForSet(set, target = {}) {
  return explicitMode(set) || inferredMode(target) || inferredMode(set) || 'reps'
}

/** Resolve a single mode for an entry; mixed work-row modes intentionally return null. */
export function modeForEntry(entry, fallback = null) {
  const source = objectOf(entry)
  const target = objectOf(source.target || source)
  const sets = Array.isArray(source.sets) ? source.sets : []
  const work = sets.filter(set => !isWarmupRow(set))
  const observed = work.length ? work : sets
  const modes = [...new Set(observed.map(set => modeForSet(set, target)))]
  if (modes.length > 1) return null
  if (modes.length === 1) return modes[0]
  const targetMode = inferredMode(target)
  if (targetMode) return targetMode
  return fallback == null ? modeForSet(source, target) : normalizeMode(fallback)
}
