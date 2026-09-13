import { estimate1RM } from './onerm.js'
import { LB_TO_KG } from './recovery.js'
import { isBw } from './history.js'
import { isSideSet, isWarmupRow } from './workout-model.js'
import { BALANCE_STATUSES, BORDERLINE_BAND_PCT, EVALUATION_MODES } from './structuralBalanceTemplates.js'

const kgOf = (n, unit) => (unit === 'lb' ? Number(n) * LB_TO_KG : Number(n))

// Mirrors the Stats.jsx `MuscleBalance` bodyweight read exactly (sort by date string, `.at(-1)`,
// convert lb -> kg) rather than the unsorted-assuming `lastBW()` in history.js.
export function bodyweightKgOf(S) {
  const entries = S.bodyweight || []
  if (!entries.length) return null
  const last = entries.slice().sort((a, b) => String(a.d).localeCompare(String(b.d))).at(-1)
  if (!last || !(last.w > 0)) return null
  return kgOf(last.w, S.unit)
}

// What one completed set actually moved, in kg. On a bodyweight-configured entry `w` holds only
// what was *added* (history.js: "`w` means *added* weight"), so the lifter's own mass has to be
// added back: a chin-up with +10 kg is not a 10 kg lift, and Poliquin's dip/pull-up ratios are
// against bodyweight + load. The weigh-in stamped on that session is the honest figure for an
// old workout, with the profile's latest as the fallback; with neither, the set is left unscored
// rather than scored against an invented body mass.
function setLoadKg(S, workout, entry, set, bodyweightKg) {
  const added = kgOf(set.w || 0, S.unit)
  const bodyweight = entry.target?.bodyweight ?? entry.bodyweight
  if (!isBw({ id: entry.id, bodyweight })) return added
  const stamped = workout?.bw > 0 ? kgOf(workout.bw, S.unit) : null
  const body = stamped ?? bodyweightKg
  return body > 0 ? body + added : null
}

// Best estimated 1RM across a whitelist of exercise ids, in kg. Scans the log directly instead of
// calling onerm.js's best1RM(), which reads `s.w` raw and so cannot see the body mass a dip or a
// pull-up moves; the estimate itself still goes through the shared estimate1RM() so the formula,
// its rounding and its rep cap stay in one place.
export function resolveCurrent(S, exerciseIds, bodyweightKg) {
  let best = null
  for (const exId of exerciseIds) {
    for (const workout of S.workouts || []) {
      const entry = (workout.entries || []).find(e => e.id === exId)
      if (!entry) continue
      for (const set of entry.sets || []) {
        if (!set.done || isWarmupRow(set)) continue
        const loadKg = setLoadKg(S, workout, entry, set, bodyweightKg)
        if (loadKg === null) continue
        const estKg = estimate1RM(loadKg, set.r)
        if (estKg === null) continue
        if (!best || estKg > best.estKg) {
          best = { estKg, w: Number(set.w) || 0, r: Math.round(Number(set.r)), d: workout.d, t: workout.start, exId }
        }
      }
    }
  }
  return best
}

// Best completed-set rep count across a whitelist, ignoring load entirely. `best1RM()` requires
// weight > 0 (a rep with no load isn't an estimate of anything), which makes it unusable for
// rep-count roles that are meant to be scored at pure bodyweight (pull-ups, dips, Nordic curl —
// no added-weight expected at all): a lifelong-bodyweight pull-up set would otherwise always
// read as 'no-data'. This mirrors onerm.js's bestSetOf()'s done/warmup filtering but drops the
// weight requirement, since reps — not an estimated 1RM — is the whole signal here.
function bestRepsOf(entry) {
  let best = null
  for (const set of entry?.sets || []) {
    if (!set.done || isWarmupRow(set)) continue
    // A unilateral row's `r` is the both-sides total (workout-model.js), but a rep target like
    // "10 pull-ups" is per limb, so the better side is what it should be read against.
    const reps = Math.round(isSideSet(set)
      ? Math.max(Number(set.sides.L?.r) || 0, Number(set.sides.R?.r) || 0)
      : Number(set.r))
    if (!isFinite(reps) || reps < 1) continue
    if (!best || reps > best.r) best = { r: reps, w: Number(set.w) || 0 }
  }
  return best
}

export function resolveCurrentReps(S, exerciseIds) {
  let best = null
  for (const exId of exerciseIds) {
    for (const workout of S.workouts || []) {
      const entry = (workout.entries || []).find(e => e.id === exId)
      const found = entry && bestRepsOf(entry)
      if (found && (!best || found.r > best.r)) best = { ...found, d: workout.d, t: workout.start, exId }
    }
  }
  return best
}

// Female target when the source table gives a distinct same-exercise figure, else the
// male/default one.
export function targetFor(role, S) {
  const female = S.body === 'female'
  if (role.evaluationMode === EVALUATION_MODES.REP_COUNT) {
    return female && role.repsTargetFemale != null ? role.repsTargetFemale : role.repsTarget
  }
  return female && role.targetPctFemale != null ? role.targetPctFemale : role.targetPct
}

export function overrideKey(template, role) {
  return `${template.id}:${role.id}`
}

// The exercise ids to resolve "current" from: the user's chosen override if one exists for this
// role, otherwise the role's curated whitelist.
export function exerciseIdsFor(S, template, role) {
  const override = S.balanceOverrides?.[overrideKey(template, role)]
  return override ? [override] : role.exerciseIds
}

// Actual percentage a role's current reading represents, given its evaluation mode. Returns
// null when it can't be scored yet (anchor has no reading of its own, or bodyweight unknown).
export function ratioFor(role, current, ctx) {
  if (role.evaluationMode === EVALUATION_MODES.LOAD_RATIO) {
    if (!ctx.anchorCurrent || !(ctx.anchorCurrent.estKg > 0)) return null
    return (current.estKg / ctx.anchorCurrent.estKg) * 100
  }
  if (role.evaluationMode === EVALUATION_MODES.BODYWEIGHT_RATIO) {
    if (!(ctx.bodyweightKg > 0)) return null
    return (current.estKg / ctx.bodyweightKg) * 100
  }
  // rep-count: the best completed-set rep count (resolveCurrentReps), as a percentage of the
  // target rep count.
  return (current.r / ctx.targetPct) * 100
}

export function classify(actualPct, targetPct) {
  if (actualPct === null || actualPct === undefined || !isFinite(actualPct)) return BALANCE_STATUSES.NO_DATA
  if (actualPct >= targetPct) return BALANCE_STATUSES.BALANCED
  if (actualPct >= targetPct - BORDERLINE_BAND_PCT) return BALANCE_STATUSES.BORDERLINE
  return BALANCE_STATUSES.WEAK
}

function evaluateRole(template, role, currentByRoleId, bodyweightKg, S) {
  const current = currentByRoleId.get(role.id)
  // For load-ratio/bodyweight-ratio, `targetPct` is a percentage — the same scale classify()
  // compares actualPct against. For rep-count it's a raw rep count (used as ratioFor()'s
  // denominator), so classify() must compare against 100 instead — actualPct is already
  // normalized to "% of the rep target" by the time it gets there.
  const targetPct = targetFor(role, S)
  const classifyTarget = role.evaluationMode === EVALUATION_MODES.REP_COUNT ? 100 : targetPct
  const override = S.balanceOverrides?.[overrideKey(template, role)]
  // Which exercise this role is set to, whether or not it has ever been logged — the view needs
  // it to name the role's exercise (and to show an override back to the user who chose it).
  const configuredExerciseId = override || role.exerciseIds[0] || null
  const base = { roleId: role.id, configuredExerciseId, targetPct, isOverridden: Boolean(override) }
  if (!current) {
    return { ...base, mappedExerciseId: null, current: null, actualPct: null, status: BALANCE_STATUSES.NO_DATA }
  }
  // An anchor role (no anchorRoleId) is compared against itself — always 100% when it has data.
  const anchorCurrent = role.anchorRoleId ? currentByRoleId.get(role.anchorRoleId) : current
  const actualPct = ratioFor(role, current, { anchorCurrent, bodyweightKg, targetPct })
  return { ...base, mappedExerciseId: current.exId, current, actualPct, status: classify(actualPct, classifyTarget) }
}

// Pure ratio-computation engine entry point.
export function computeBalance(S, template) {
  const bodyweightKg = bodyweightKgOf(S)
  const currentByRoleId = new Map(
    template.roles.map(role => {
      const ids = exerciseIdsFor(S, template, role)
      const current = role.evaluationMode === EVALUATION_MODES.REP_COUNT
        ? resolveCurrentReps(S, ids)
        : resolveCurrent(S, ids, bodyweightKg)
      return [role.id, current]
    })
  )
  return template.roles.map(role => evaluateRole(template, role, currentByRoleId, bodyweightKg, S))
}
