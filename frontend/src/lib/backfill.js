// Logging a workout after the fact. The session itself is the ordinary active workout with a
// `backfill` field on it; these helpers are the parts that differ from a live session, kept
// pure so the date arithmetic and the history surgery can be tested without the UI.
import { bestWeightForEntry } from './history.js'
import { isSideSet, syncSideAggregate } from './workout-model.js'

export const workoutsOn = (S, iso) => (S.workouts || []).filter(w => w.d === iso)

// Epoch of `iso` at the given wall-clock time, in the browser's zone — the same zone
// todayISO() and isoOf() use, so `d` and `start` agree the way they do for a live session.
export const backfillStart = (iso, time = '18:00') => {
  const [h, m] = String(time || '18:00').split(':').map(Number)
  const d = new Date(iso + 'T12:00:00')
  d.setHours(h || 0, m || 0, 0, 0)
  return d.getTime()
}

// A live session ends when you tap finish; a logged one ends when you said it did.
export const backfillEnd = active => active.start + Math.max(1, active.backfill?.durationMin || 60) * 60000

// The history a session logged into the past is built from (#284): only what came before it.
// Built from the whole log, "Log this workout" for a missed Monday opened at the weights Friday's
// session had progressed to and saved them as Monday's — a spike on the chart, and a best set dated
// days before it was lifted. A session sits where insertChronological files it, so everything filed
// ahead of that spot is its past: earlier days, and earlier the same day. The workout it replaces
// is not, since that one is gone once this is saved. A confirmed working weight (exWeights) dated
// after the day is later progression as well; one with no date is kept, nothing says when it came.
// A view for reading only: the lists are new, everything else is S's own.
export function historyAsOf(S, { d, start = 0, replaceId = null }) {
  const filedBefore = w => (w.d || '') < d || ((w.d || '') === d && (w.start || 0) <= start)
  const workouts = (S.workouts || []).filter(w => filedBefore(w) && !(replaceId && w.id === replaceId))
  const exWeights = Object.fromEntries(Object.entries(S.exWeights || {}).filter(([, kept]) => !kept?.d || kept.d <= d))
  return { ...S, workouts, exWeights }
}

// The history the running session is built from and held against: as of its own day while it is
// logged into the past, and the whole log for a live one (S itself, so that costs nothing).
export const sessionHistory = S => {
  const A = S?.active
  return A?.backfill ? historyAsOf(S, { d: A.d, start: A.start, replaceId: A.backfill.replaceId }) : S
}

// The workouts array is chronological (History reverses it), so a past workout cannot just be
// pushed — it goes where its date and start time put it, after anything from the same moment.
export function insertChronological(workouts, w) {
  const key = x => [x.d || '', x.start || 0]
  const [d, s] = key(w)
  let i = workouts.length
  while (i > 0) {
    const [pd, ps] = key(workouts[i - 1])
    if (pd < d || (pd === d && ps <= s)) break
    i--
  }
  return [...workouts.slice(0, i), w, ...workouts.slice(i)]
}

// The history after a backfilled session is filed: the workout it replaces (if any) is gone
// and the new one sits in date order. Returns a new array; the caller stores it.
export function completeBackfill(workouts, active, w) {
  const replaceId = active.backfill?.replaceId
  const kept = replaceId ? workouts.filter(x => x.id !== replaceId) : workouts
  return insertChronological(kept, w)
}

// "Mark all sets done" while logging a past workout (#284). A session written down after the
// fact went as planned more often than not — a routine that is just a run is the case that asked
// for it — and ticking every box one by one to say so is the chore that leaves it unlogged. Both
// sides of a unilateral set are ticked, and each exercise gets the top weight that ticking its
// last set would have stamped. Returns new entries; the caller stores them.
export function markAllSetsDone(entries) {
  return (entries || []).map(entry => {
    const sets = (entry.sets || []).map(s => (isSideSet(s)
      ? syncSideAggregate({ ...s, sides: { L: { ...s.sides.L, done: true }, R: { ...s.sides.R, done: true } } })
      : { ...s, done: true }))
    const next = { ...entry, sets }
    next.topW = bestWeightForEntry(next) || null
    return next
  })
}
