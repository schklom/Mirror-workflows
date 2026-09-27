// The photos and videos of a logged workout: a progress photo, a form-check clip.
//
// Nothing new under the hood: a workout's `media` is a list of the same MediaRefs a custom
// exercise carries (lib/media-refs.js), made by the same ingest, kept in the same local store,
// uploaded by the same sync and swept by the same GC — which is why referencedHashes walks
// workouts[].media on both the server and the client. This file only edits the list on a saved
// workout, the one place it is written.
//
// Each edit is an edit of the saved workout, so it is stamped (stampWorkout) the way a corrected
// note or a moved date is: a conflict between two copies keeps the version edited last, and a
// photo added on the phone is not lost to the desktop's copy just because that one logged a
// weigh-in since (lib/sync-merge.js). Only a real change stamps — a stamp outranks whatever
// another device wrote since.
import { normalizeMediaRef, workoutMediaOf, WORKOUT_MEDIA_MAX } from './media-refs.js'
import { sameWorkout } from './workout-date.js'
import { stampWorkout } from './sync-merge.js'

const recordOf = (state, w) => (Array.isArray(state?.workouts) ? state.workouts.find(x => x && sameWorkout(x, w)) : null) || null

function write(rec, list, now) {
  if (list.length) rec.media = list
  else delete rec.media
  stampWorkout(rec, now)
}

/**
 * Adds a photo or video to the saved workout `w` (the record or a copy of it) inside `state`.
 * Returns 'added', or why not: 'gone' (the workout was deleted meanwhile), 'invalid' (not a
 * MediaRef normalizeMediaRef accepts), 'full' (already WORKOUT_MEDIA_MAX) or 'dup' (that very
 * file is already on it). Mutates `state` — made for useStore's update().
 */
export function addWorkoutMedia(state, w, ref, now = Date.now()) {
  const rec = recordOf(state, w)
  if (!rec) return 'gone'
  const m = normalizeMediaRef(ref)
  if (!m) return 'invalid'
  const list = workoutMediaOf(rec)
  if (list.some(x => x.hash === m.hash)) return 'dup'
  if (list.length >= WORKOUT_MEDIA_MAX) return 'full'
  write(rec, [...list, m], now)
  return 'added'
}

/**
 * Takes the file `hash` off the saved workout `w`. Returns whether anything changed. The file
 * itself is left to the GCs: another device, a stash or an exercise may still refer to it, and
 * the server keeps it for its grace period either way.
 */
export function removeWorkoutMedia(state, w, hash, now = Date.now()) {
  const rec = recordOf(state, w)
  if (!rec) return false
  const list = workoutMediaOf(rec)
  const left = list.filter(x => x.hash !== hash)
  if (left.length === list.length) return false
  write(rec, left, now)
  return true
}

/** Whether another photo or video still fits on `w`. */
export const workoutMediaRoom = w => workoutMediaOf(w).length < WORKOUT_MEDIA_MAX
