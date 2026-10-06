import { t } from './i18n.js'
import { EXDB } from './exercises-data.js'

// Every equipment value present in the catalogue, most common first — this becomes the
// checklist Settings shows when you build a profile.
export const ALL_EQUIPMENT = (() => {
  const c = {}
  EXDB.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  const ranked = Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1))
  // Clubbell and macebell have no catalogue entries yet (issue #393). They still belong on the
  // profile checklist and the custom-exercise chips, after everything the catalogue already uses.
  for (const extra of ['clubbell', 'macebell']) if (!ranked.includes(extra)) ranked.push(extra)
  return ranked
})()

// Body weight is never gated by a profile — no gym or home setup can take it away from you,
// and every profile should be able to see bodyweight exercises regardless of what's checked.
const ALWAYS_AVAILABLE = 'body weight'

export function activeProfile(S) {
  if (!S.equipFilterOn) return null
  const profiles = S.equipProfiles || []
  return profiles.find(p => p.id === S.activeEquipId) || null
}

// Whether an exercise is usable under the active profile. With filtering off, or no profile
// selected, everything is available — this is purely additive, never a trap that hides your
// whole library because you haven't set anything up yet.
export function exAvailable(S, ex) {
  const p = activeProfile(S)
  if (!p) return true
  if (!ex.eq || ex.eq === ALWAYS_AVAILABLE) return true
  return (p.equipment || []).includes(ex.eq)
}

export function newProfile(name) {
  return { id: 'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, equipment: [] }
}
