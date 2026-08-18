// Focused workout semantics shared by session, history, and strength views.
// Legacy records have no explicit phase or mode, so the defaults preserve main's work/reps shape.

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