// Pure decisions for the active-workout superset flow. Keeping these independent of React and
// the stores makes the uneven-round and re-check rules explicit and directly testable.
const hasWork = (entries, idx) => !!entries[idx]?.sets?.some(set => !set.done)

// A completion is new progress only when it takes this exercise beyond the largest number of
// simultaneously completed sets seen in this mounted session. Uncheck/re-check therefore does
// not repeat navigation or rest side effects, while completing an added set still can.
export function setProgressHighWater(entry, previous = 0) {
  const done = entry?.sets?.reduce((count, set) => count + (set.done ? 1 : 0), 0) || 0
  return { isNew: done > previous, highWater: Math.max(previous, done) }
}

// Decide where a newly completed superset set goes next. Spent members are skipped, including
// across the wrap. A round ends when no later member in display order has work left; this makes
// the last *active* member the boundary rather than blindly using the group's last array index.
export function supersetFlowStep(entries, unit, fromIdx) {
  if (!Array.isArray(entries) || !Array.isArray(unit) || unit.length <= 1) return null
  const pos = unit.indexOf(fromIdx)
  if (pos < 0) return null

  const unitDone = !unit.some(idx => hasWork(entries, idx))
  if (unitDone) return { unitDone: true, roundDone: false, nextIdx: null }

  const wrapped = [...unit.slice(pos + 1), ...unit.slice(0, pos + 1)]
  const nextIdx = wrapped.find(idx => hasWork(entries, idx)) ?? null
  const roundDone = !unit.slice(pos + 1).some(idx => hasWork(entries, idx))
  return { unitDone: false, roundDone, nextIdx }
}
