// Normalize the two bounds used by double progression.
// `reps` is the upper bound and `repsMin` is the lower bound in persisted configs.
export function normalizeRepRange(reps, repsMin) {
  const upper = positiveInt(reps, 10)
  const lower = positiveInt(repsMin, Math.max(1, upper - 2))
  return lower >= upper
    ? { reps: lower + 1, repsMin: lower }
    : { reps: upper, repsMin: lower }
}

function positiveInt(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n)) : fallback
}
