import { FATIGUE_SCAN_MS, fatigueOf } from '../src/lib/recovery.js'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const BASE = Date.UTC(2026, 0, 31, 12)
const ID = '1254'

const workout = (start, weight, count = 8) => ({
  d: new Date(start).toISOString(),
  start,
  entries: [{
    id: ID,
    sets: Array.from({ length: count }, () => ({ done: true, w: weight, r: 8 })),
  }],
})

// Deterministic LCG: failures reproduce exactly without an external property-testing dependency.
let seed = 0x5eed1234
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 0x100000000
}

let comparisons = 0
let deletionComparisons = 0
let largestIncrease = -Infinity
for (let historyIndex = 0; historyIndex < 100; historyIndex += 1) {
  const sessionCount = 3 + Math.floor(random() * 10)
  const history = Array.from({ length: sessionCount }, () => {
    const ageHours = Math.floor(random() * 120 * 24)
    const weight = 40 + Math.floor(random() * 141)
    const count = 1 + Math.floor(random() * 12)
    return workout(BASE - ageHours * HOUR, weight, count)
  })

  let previous = fatigueOf(history, BASE).chest
  for (let hour = 1; hour <= 1080; hour += 1) {
    const current = fatigueOf(history, BASE + hour * HOUR).chest
    const increase = current - previous
    largestIncrease = Math.max(largestIncrease, increase)
    if (increase > 1e-12) {
      throw new Error(
        `fatigue increased in history ${historyIndex} at hour ${hour}: ${previous} -> ${current}`,
      )
    }
    previous = current
    comparisons += 1
  }

  const beforeDeletion = fatigueOf(history, BASE)
  for (let deleted = 0; deleted < history.length; deleted += 1) {
    const afterDeletion = fatigueOf(history.filter((_, index) => index !== deleted), BASE)
    for (const [slug, before] of Object.entries(beforeDeletion)) {
      if (afterDeletion[slug] > before + Number.EPSILON) {
        throw new Error(
          `deleting workout ${deleted} in history ${historyIndex} increased ${slug}: `
          + `${before} -> ${afterDeletion[slug]}`,
        )
      }
      deletionComparisons += 1
    }
  }
}

if (comparisons !== 108000) throw new Error(`expected 108000 comparisons, got ${comparisons}`)

// Pin the two history-edit invariants alongside the randomized property probes.
const today = workout(BASE, 100, 5)
const baseline = fatigueOf([today], BASE).chest
for (const oldImport of [workout(BASE - 90 * DAY, 140, 10), workout(BASE - 90 * DAY, 100, 20)]) {
  if (fatigueOf([oldImport, today], BASE).chest !== baseline) {
    throw new Error('an import older than the scan changed current fatigue')
  }
}

const deletionHistory = [
  workout(BASE - FATIGUE_SCAN_MS - DAY, 100, 15),
  workout(BASE - 3 * DAY, 100, 8),
  workout(BASE - 2 * DAY, 100, 8),
  workout(BASE - DAY, 60, 4),
  workout(BASE, 120, 10),
]
const beforePinnedDeletion = fatigueOf(deletionHistory, BASE)
for (let deleted = 0; deleted < deletionHistory.length; deleted += 1) {
  const afterDeletion = fatigueOf(
    deletionHistory.filter((_, index) => index !== deleted),
    BASE,
  )
  for (const [slug, before] of Object.entries(beforePinnedDeletion)) {
    if (afterDeletion[slug] > before + Number.EPSILON) {
      throw new Error(`deleting workout ${deleted} increased ${slug}: ${before} -> ${afterDeletion[slug]}`)
    }
  }
}

console.log(`monotonic probe: ${comparisons} comparisons, largest increase ${largestIncrease}, PASS`)
console.log(
  `history-edit probe: out-of-scan imports stable; ${deletionComparisons} randomized `
  + 'single-workout deletion comparisons non-increasing, PASS',
)
