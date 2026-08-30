// How a session's exercise entries are built from a routine. Shared by the live start and by
// "log a past workout", which is the same screen pointed at another day — both must walk up
// to identical entries, or the two paths drift apart the first time a prescription rule changes.
// Imports both history.js and progression.js (which itself imports history.js); nothing in
// either imports this file, so there is no cycle.
import { buildSets, applyIntensifierPlan } from './history.js'
import { nextPrescription, applyPrescription, defaultIncrement } from './progression.js'

export function buildSessionEntries(st, r) {
  // The prescription is applied as the session is built, so you walk up to the bar with the
  // right weight already on the screen instead of being told about it afterwards. `plan` is
  // kept on the entry purely so the workout can explain the number it chose.
  const excluded = r?.excludeFromProgression === true
  const entries = (r ? r.ex : []).map(cfg => {
    const plan = excluded ? { policy: 'off', kind: 'off' } : nextPrescription(st, cfg, r)
    const step = defaultIncrement(cfg.id, st.unit)
    const sets = applyIntensifierPlan(applyPrescription(buildSets(st, cfg, { step, useTarget: excluded }), plan, step), cfg)
    return { id: cfg.id, sg: cfg.sg, target: { ...cfg }, plan, sets }
  })
  return { entries, excluded }
}
