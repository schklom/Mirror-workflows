import { uid } from './format.js'

/**
 * Create a deep copy of a routine with a new id and a "(Copy)" suffix.
 * All exercises and their configuration are preserved independently.
 */
export function copyRoutine(routine, suffix = 'Copy') {
  const copy = structuredClone(routine)
  copy.id = uid()
  // "Push (Copy)" copied again becomes "Push (Copy 2)", not "Push (Copy) (Copy)".
  const esc = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp('^(.*) \\(' + esc + '(?: (\\d+))?\\)$').exec(routine.name || '')
  copy.name = m ? m[1] + ' (' + suffix + ' ' + ((Number(m[2]) || 1) + 1) + ')' : routine.name + ' (' + suffix + ')'
  return copy
}

/**
 * Delete a routine and every pointer to it, in place on a store draft. A weekday holds a list of
 * routine ids, so the deleted one is pulled from each day and the key dropped when it empties
 * (never store []); a day that never named it is left exactly as it was. A per-date reschedule
 * (dayPlan) naming it goes too: left behind, the day still counts as overridden and wears a
 * "rescheduled" badge for good with no way to clear it.
 *
 * Plan's swipe, RoutineEdit's button and the Coach's remove-routine all delete through here, so
 * the next thing that learns to point at a routine is cleaned up in one place, not three.
 * Returns the dropped dayPlan entries ({ iso: id }), which the Coach records so a revert can put
 * them back.
 */
export function deleteRoutine(s, id) {
  s.routines = s.routines.filter(r => r.id !== id)
  Object.keys(s.week || {}).forEach(d => {
    const ids = [].concat(s.week[d])
    if (!ids.includes(id)) return
    const next = ids.filter(rid => rid !== id)
    if (next.length) s.week[d] = next; else delete s.week[d]
  })
  const dropped = {}
  Object.keys(s.dayPlan || {}).forEach(iso => {
    if (s.dayPlan[iso] === id) { dropped[iso] = id; delete s.dayPlan[iso] }
  })
  return dropped
}
