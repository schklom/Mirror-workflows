// Formatting glue between pure lib helpers and the JSON the MCP tools return to an LLM.
//
// The lib modules speak in compact codes (e.g. `nextPrescription.why` is [template, ...args])
// because the UI also needs to translate them. An LLM doesn't read templates, so the tools
// format each value into final English text before serialising. Keeping this in one place
// means a fix to a phrasing lands in every tool at once.
import { MUSCLE_NAME, MUSCLES } from '../../frontend/src/lib/muscles.js'
import { modeOf, fmtSec, setLabel } from '../../frontend/src/lib/history.js'
import { POLICY_NAME } from '../../frontend/src/lib/progression.js'
import { fmtDate, fmtNum, fmtDur } from '../../frontend/src/lib/format.js'

/** Apply {0},{1},… substitutions to the template strings the lib returns. */
export function fmt(template, args) {
  let v = template
  for (let i = 0; i < (args || []).length; i++) v = v.replaceAll('{' + i + '}', String(args[i]))
  return v
}

/** Pre-formatted label for one set, e.g. "5 @ 60 kg", "1:30 · 20 kg", "20 min @ 8 km/h". */
export { setLabel }

/** A one-line description of a routine entry, e.g. "3 × 10 · 60 kg". Accepts a cfg + unit. */
export function exLine(cfg, unit) {
  const mode = modeOf(cfg)
  const n = cfg.sets || 1
  const load = cfg.weight ? ' · ' + fmtNum(cfg.weight) + ' ' + unit : ''
  if (mode === 'cardio') return `${n} × ${cfg.min || 20} min @ ${fmtNum(cfg.speed || 8)} km/h`
  if (mode === 'time') return `${n} × ${fmtSec(cfg.sec || 45)}${load}`
  return `${n} × ${cfg.reps}${load}`
}

/** A human name for a muscle slug, falling back to the slug if unmapped. */
export function muscleName(slug) {
  return MUSCLE_NAME[slug] || slug
}

/** English name of a progression policy, falling back to the slug. */
export function policyName(policy) {
  return POLICY_NAME[policy] || policy
}

/** Friendly month-day for an ISO date ("3 Jul"); used in summaries so the LLM reads natural. */
export function friendlyDate(iso) {
  if (!iso) return null
  return fmtDate(iso)
}

/** Duration in minutes ("46 min", "1h 14m"). */
export function friendlyDuration(ms) {
  return ms ? fmtDur(ms) : null
}

/** Sums vs planned and returns a "{done}/{total}" label. */
export function ratio(done, total) {
  return `${done}/${total}`
}

/** Returns the muscle slugs in head-to-toe order (the same order UI lists them). */
export function muscleOrder() { return MUSCLES.slice() }
