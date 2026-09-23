import { uid } from './format.js'
import { defaultConfig, isBw, modeOf } from './history.js'
import { isBodyweightEq, isCardio } from './exercises.js'

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
 * A routine slot with another exercise in it (#110): the machine you planned around is gone, or
 * a variation takes over the lift for a block. The slot keeps its place and what was set up for
 * it — sets, reps, weight, rest, warm-ups, the progression rule, the note, its superset — and only
 * the exercise changes. The old way (remove, add, configure again) lost all of that.
 *
 * Two things cannot come along. A cardio slot is minutes at a speed and a lifting slot is sets of
 * reps at a load, so between the two only the note, the rest and the superset carry over and the
 * rest starts from the new exercise's defaults. And a load means something else once the new
 * exercise is bodyweight where the old one was not, or the other way round: 60 kg on a bench is
 * not 60 kg added to a push-up. There the weight goes back to 0. The bodyweight flag is stored
 * only where it overrides an exercise's equipment, so it is always dropped and the new exercise
 * follows its own.
 *
 * What is not carried is history. Progress belongs to a routine and an exercise together (#216),
 * so the new exercise starts on its own line — its own sessions in this routine, and until there
 * are any, the slot's numbers — and the old exercise keeps its sessions, ready if it comes back.
 */
export function replaceSlotExercise(slot, id) {
  const old = slot || {}
  if ((modeOf(old) === 'cardio') !== isCardio(id)) {
    const kept = ['sg', 'note', 'restSec'].filter(key => old[key] != null)
    return { id, ...defaultConfig(id), ...Object.fromEntries(kept.map(key => [key, old[key]])) }
  }
  const { id: _replaced, bodyweight: _flag, ...carried } = old
  const out = { id, ...carried }
  if (!isCardio(id) && isBw(old) !== isBodyweightEq(id)) {
    out.weight = 0
    // A rep ceiling belongs to bodyweight work: it adds sets where there is no load to add.
    delete out.repsMax
  }
  return out
}
