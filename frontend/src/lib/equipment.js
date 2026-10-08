import { t } from './i18n.js'
import { EXDB } from './exercises-data.js'

// Pieces of kit the catalogue never names as an exercise's equipment — "dumbbell bench press" is
// tagged `dumbbell`, yet it needs a bench; "chin-up" is tagged `body weight`, yet it needs a bar.
// They are read off the exercise name instead of stored on 1,300 rows, and sit in the profile
// checklist beside the real equipment values.
export const ACCESSORIES = ['bench', 'pull-up bar']

// Machines that carry their own seat, bar or bench: "lever incline chest press" needs no bench.
const SELF_CONTAINED = new Set(['leverage machine', 'sled machine', 'assisted'])

// Which accessories an exercise needs, e.g. ['bench'] for "dumbbell incline bench press".
export function accessoriesOf(ex) {
  if (!ex.n || SELF_CONTAINED.has(ex.eq)) return []
  const n = ex.n.toLowerCase()
  const need = []
  if (/\bbench\b|\bincline\b|\bdecline\b/.test(n)) need.push('bench')
  if (/pull-up|pull up|chin-up|\bchin\b|hanging|muscle-up|muscle up/.test(n)) need.push('pull-up bar')
  return need
}

// Every equipment value present in the catalogue, most common first, then the accessories —
// this becomes the checklist Settings shows when you build a profile.
export const ALL_EQUIPMENT = (() => {
  const c = {}
  EXDB.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  return Object.keys(c).sort((a, b) => c[b] - c[a] || (a < b ? -1 : 1)).concat(ACCESSORIES)
})()

// Body weight is never gated by a profile — no gym or home setup can take it away from you,
// and every profile should be able to see bodyweight exercises regardless of what's checked.
// Only the accessory an exercise needs (a bar, a bench) can still gate it.
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
  const have = p.equipment || []
  if (ex.eq && ex.eq !== ALWAYS_AVAILABLE) {
    // Equipment no profile can tick (an imported exercise's "custom") would hide the user's own
    // exercise under every profile, with no way to bring it back. It stays, like body weight.
    if (!ALL_EQUIPMENT.includes(ex.eq)) return true
    if (!have.includes(ex.eq)) return false
  }
  return accessoriesOf(ex).every(a => have.includes(a))
}

export function newProfile(name) {
  return { id: 'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, equipment: [] }
}
