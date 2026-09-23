// A finished workout as plain text, for "Copy as text" in its detail sheet (Discord 'Improvement
// ideas'): something to paste into a chat, a coach's spreadsheet or a notes app. The sets are the
// same labels the history shows, so a drop-set or a rest-pause set reads the same in both.
// i18n-core rather than i18n, like history.js: nothing here needs the React half.
import { setLabel, supersetUnits, workoutVolume } from './history.js'
import { hasCompletedWork, isWarmupRow } from './workout-model.js'
import { fmtDate, fmtNum, fmtVol, durPart, capWords } from './format.js'
import { t } from './i18n-core.js'

/**
 * `unit` is the profile's, `nameOf(entry)` the exercise's display name. Blocks are separated by
 * a blank line: the heading, then each exercise (a superset's under one "Superset" line, its
 * members together), then the session note.
 */
export function workoutText(w, { unit, nameOf }) {
  const facts = [
    ...durPart((w.end || 0) - (w.start || 0)),
    fmtVol(w.vol ?? workoutVolume(w), unit),
    ...(w.bw ? [t('Body weight') + ' ' + fmtNum(w.bw) + ' ' + unit] : []),
  ]
  const blocks = [[[w.name, fmtDate(w.d, true, true)].filter(Boolean).join(' — '), facts.join(' · ')].join('\n')]
  // Work sets only: the text is what you trained, the work the volume above counts. Warm-ups are
  // left out of volume, records and progression everywhere else, and listed here with nothing to
  // tell them apart they would read as sets of their own.
  const lines = entry => {
    const sets = (entry.sets || []).filter(s => hasCompletedWork(s) && !isWarmupRow(s))
    if (!sets.length) return null
    return [capWords(nameOf(entry)), sets.map(s => setLabel(entry.id, s, entry.target)).join(', '), ...(entry.note ? [entry.note] : [])]
  }
  const entries = w.entries || []
  for (const group of supersetUnits(entries)) {
    const members = group.map(i => lines(entries[i])).filter(Boolean)
    if (!members.length) continue
    blocks.push([...(members.length > 1 ? [t('Superset')] : []), ...members.flat()].join('\n'))
  }
  if (w.note) blocks.push(w.note)
  return blocks.join('\n\n')
}
