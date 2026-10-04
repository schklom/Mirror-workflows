// Rotation — the in-app half of the queue (lib/queue.js).
//
//   S.rotation = null | { id: string, sequence: string[], label: string }
//
// `S.rotation` is a DEFINITION, never a live queue: what the calendar, the reminders and the MCP
// resolve is always `S.queue`. `scheduleModeOf` is Home/Plan's own display choice: a live queue
// always wins regardless of `S.scheduleMode` (an external writer never has to know the flag
// exists), and the flag itself exists only to hold Rotation selected — weekday grid hidden, both
// screens showing the rotation editor — from the moment it is chosen through to the first
// routine being added, since there is no queue yet at that point to derive anything from.
//
// OWNERSHIP — `S.queue.rotationId === S.rotation.id` marks a pass this app manages: only such a
// pass refills itself when it completes. A planner's queue omits `rotationId`, so it completes
// and waits for its writer; saving it from Plan's editor adopts it (stamps the id) and opts it
// into refill from that point on. The token also stops a stale saved rotation from reclaiming
// somebody else's queue that happens to hold the same routine ids.
//
// THE ONE-DAY BOUNDARY — a new pass created by a completion starts the day AFTER the workout
// that closed the old one. The done rule (queue.js) credits a workout dated on or after
// `startsOn` whose name matches the routine even when its `start` predates `since` — the
// fallback for an early or unreliable clock. Without the boundary the session that finished the
// old pass would immediately tick an item of the new one.

import { isoOf, todayISO, uid } from './format.js'
import { queueOf, queueView } from './queue.js'

const routineIdsOf = w => (Array.isArray(w?.routineIds) ? w.routineIds : (w?.routineId ? [w.routineId] : []))
const dayAfter = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + 1); return isoOf(d) }

/** 'rotation' while a usable live queue exists, or once chosen with nothing built yet (S.scheduleMode). */
export const scheduleModeOf = S => (queueOf(S) || S?.scheduleMode === 'rotation') ? 'rotation' : 'week'

/** A queue payload arrived but is unusable (malformed, duplicate-only, all-deleted): Week + a fix-up in Plan. */
export const queueRecovery = S => S?.queue != null && !queueOf(S)

/** The saved sequence's routines that still exist, first occurrence of each — the ids a new pass gets. */
export const rotationIds = S => {
  const seq = Array.isArray(S?.rotation?.sequence) ? S.rotation.sequence : []
  const routines = Array.isArray(S?.routines) ? S.routines : []
  return seq.filter((id, i) => seq.indexOf(id) === i && routines.some(r => r.id === id))
}

const newPass = (ids, label, rotationId, startsOn, since) => ({ ids, since, startsOn, label, rotationId })

/** Workouts that could have credited `q`'s pass: dated on/after its startsOn, matching one of its ids. */
const creditWindow = (s, q) => (s.workouts || [])
  .filter(w => String(w.d || '') >= q.startsOn && routineIdsOf(w).some(id => q.ids.includes(id)))

/**
 * `now`, or later still when a workout already in the credit window would otherwise re-credit
 * the new pass — a backdated or future-clock finish, or one just written by the caller. The done
 * rule's first clause is `w.start >= since` with no date bound of its own, so `since` is the only
 * thing keeping an old pass's own workouts from also ticking the new one.
 */
const sinceAfter = (s, q, now) => Math.max(now, ...creditWindow(s, q).map(w => (w.start ?? 0) + 1))

/**
 * Clears dayPlan pins dated `today` or later that name one of `ids` — a pass no longer owns
 * them (dropped, replaced by a refill, or ended outright), so a leftover pin never resurfaces as
 * an "open" pin on a session that isn't this pass's any more (pinState, queue.js) or, once no
 * queue is left at all, as a plain routine override history.js was never meant to read it as.
 */
const sweepPins = (s, ids, today) => {
  if (!ids.length) return
  Object.keys(s.dayPlan || {}).forEach(iso => {
    if (iso >= today && ids.includes(s.dayPlan[iso])) delete s.dayPlan[iso]
  })
}

/** Settings → Rotation with a saved rotation and no queue. False when nothing valid is left to start. */
export function startPass(s, today = todayISO(), now = Date.now()) {
  const ids = rotationIds(s)
  if (!ids.length) return false
  s.queue = newPass(ids, s.rotation.label || '', s.rotation.id, today, now)
  return true
}

/**
 * Plan's editor save: create the rotation on the first save, adopt an externally written queue,
 * or apply an ordinary edit. An edit keeps the running pass's `since`/`startsOn`, and the done
 * rule is by routine id since `since`, so progress already logged survives a reorder — and an id
 * added back after it was already trained today reads as done straight away.
 */
export function saveRotation(s, ids, label, today = todayISO(), now = Date.now()) {
  if (!ids.length) return
  const prev = queueOf(s)
  s.rotation = { id: s.rotation?.id ?? uid(), sequence: ids, label }
  s.queue = {
    ids,
    since: prev?.since ?? now,
    startsOn: prev?.startsOn ?? today,
    label,
    rotationId: s.rotation.id,
  }
  // A session dropped from the rotation leaves its future pin behind otherwise — dayPlan then
  // still resolves that date to a session the queue no longer has (pinState/queue.js).
  sweepPins(s, (prev?.ids || []).filter(id => !ids.includes(id)), today)
  // An edit (e.g. removing the last session still to do) can leave the pass complete on the
  // spot — without this it would sit idle until a workout happened to reach refillAfter.
  if (queueView(s, today)?.complete) startNewPass(s, today, now)
}

/**
 * Ends the current pass without touching the saved sequence — "Use Fixed Week", or the editor
 * emptied down to nothing. Sweeps the same future pins saveRotation does, so a dropped pass never
 * resurfaces as a plain routine override (history.js) once the weekday plan is back in charge.
 */
export function stopPass(s, today = todayISO()) {
  const q = queueOf(s)
  if (q) sweepPins(s, q.ids, today)
  s.queue = null
}

/** The latest day a workout could have credited the current pass, or null. */
const lastCreditDay = s => {
  const q = queueOf(s)
  if (!q) return null
  const days = creditWindow(s, q).map(w => w.d)
  return days.length ? days.sort().at(-1) : null
}

/**
 * Plan's "Start new pass": throw the current pass away and begin the saved sequence again. From
 * today — unless today's own workout closed the pass being replaced, which would otherwise be
 * credited twice (see THE ONE-DAY BOUNDARY above).
 */
export function startNewPass(s, today = todayISO(), now = Date.now()) {
  if (!s.rotation) return
  const ids = rotationIds(s)
  if (!ids.length) return
  const q = queueOf(s)
  const last = lastCreditDay(s)
  const startsOn = last && last >= today ? dayAfter(last) : today
  if (q) sweepPins(s, q.ids, today)
  s.queue = newPass(ids, s.rotation.label || '', s.rotation.id, startsOn, q ? sinceAfter(s, q, now) : now)
}

/** Is `ids` some circular ordering of `seq`? (Both already normalized, so ids are unique.) */
const isCircular = (ids, seq) => {
  if (!ids.length || ids.length !== seq.length) return false
  const i = seq.indexOf(ids[0])
  return i >= 0 && ids.every((id, n) => seq[(i + n) % seq.length] === id)
}

/** `seq` rotated to begin just after `afterId`; unchanged when the id is not in it. */
const rotate = (seq, afterId) => {
  const i = seq.indexOf(afterId)
  return i < 0 ? seq : [...seq.slice(i + 1), ...seq.slice(0, i + 1)]
}

/**
 * Called with the state a finished workout has just been written into. Replaces a COMPLETE pass
 * this app manages with the next one and returns true; returns false — leaving `S.queue`
 * untouched — for an incomplete pass, a queue with no matching `rotationId`, or a managed pass
 * that no longer matches its rotation (the editor will resync it on the next save).
 *
 * The next pass is the rotation, rotated so it begins after the final queue id this workout
 * credited: `[A,B,C]` closed by C repeats as `[A,B,C]`, closed by B becomes `[C,A,B]`.
 */
export function refillAfter(s, w, today = todayISO(), now = Date.now()) {
  const q = queueOf(s)
  if (!q?.rotationId || !s.rotation?.id || q.rotationId !== s.rotation.id) return false
  if (!queueView(s, today)?.complete) return false
  const seq = rotationIds(s)
  if (!isCircular(q.ids, seq)) return false
  const credited = routineIdsOf(w)
  const last = q.ids.filter(id => credited.includes(id)).at(-1) ?? null
  const bound = [w.d, lastCreditDay(s)].filter(Boolean).sort().at(-1)
  sweepPins(s, q.ids, today)
  // The rotation's own label only — never the closing pass's (q.label): once adopted from a
  // planner, that would otherwise repeat its original week name ("US W1") on every pass this app
  // generates on its own from then on.
  s.queue = newPass(rotate(seq, last), s.rotation.label || '', s.rotation.id, dayAfter(bound), sinceAfter(s, q, now))
  return true
}
