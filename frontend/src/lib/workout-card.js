// A finished workout as a picture, for "Share as image" in its detail sheet (#453): plain text
// loses its layout in most chat apps, a card keeps it. Three steps, so the part that decides what
// the card says and where it goes is testable without a canvas:
//   workoutCardModel  — what the card says: name, date, duration, sets, volume, new bests
//   layoutWorkoutCard — where each line goes, given a way to measure text
//   drawWorkoutCard   — paints a layout onto a 2D canvas context
// Nothing here stores anything; the workout is read, never written.
import { sessionSections, workoutVolume, workoutDuration, workoutDay, doneUnits } from './history.js'
import { EXIDX } from './exercises.js'
import { isWarmupRow } from './workout-model.js'
import { fmtDate, fmtVol, durPart, capWords } from './format.js'
import { t, tn, exerciseNameClass } from './i18n-core.js'

export const CARD_WIDTH = 1080
const PAD = 88
const MIN_HEIGHT = 720
// More than this many new bests and the rest are counted instead of listed: a card that grows
// past a phone screen is not glanceable any more.
export const MAX_RECORDS = 6
const TITLE_LINES = 2

/**
 * What the card says. `unit` is the profile's, `nameOf(entry)` the exercise's display name — the
 * same pair "Copy as text" takes (workoutText). Sets are work sets, as the volume is: warm-ups are
 * left out of both, the way they are left out of records and progression everywhere else. A
 * per-side set counts once per side, as the workout screen counts it.
 */
export function workoutCardModel(w, { unit, nameOf }) {
  const entries = w.entries || []
  const sets = entries.reduce((n, e) => n + (e.sets || []).reduce((m, s) => m + (isWarmupRow(s) ? 0 : doneUnits(s)), 0), 0)
  // New bests in the order the sheet lists the exercises, each named once — a combined session
  // can hold the same lift twice.
  const prs = new Set(w.prs || [])
  const records = []
  for (const i of sessionSections(entries).flatMap(section => section.units).flat()) {
    const entry = entries[i]
    if (!entry || !prs.has(entry.id) || records.some(r => r.id === entry.id)) continue
    const name = nameOf(entry)
    records.push({ id: entry.id, name: exerciseNameClass(EXIDX[entry.id]) ? capWords(name) : name })
  }
  const day = workoutDay(w)
  return {
    title: w.name || '',
    date: day ? fmtDate(day, true, true) : '',
    facts: [...durPart(workoutDuration(w)), tn('{0} set', '{0} sets', sets), fmtVol(w.vol ?? workoutVolume(w), unit)],
    records: records.map(r => r.name),
  }
}

// Greedy word wrap to `max` lines; the last line that does not fit is cut with an ellipsis.
// A word wider than the line on its own (a long German compound) is cut too, never overflowed.
export function wrapText(text, width, measure, max) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (let i = 0; i < words.length; i++) {
    const next = line ? line + ' ' + words[i] : words[i]
    if (measure(next) <= width) { line = next; continue }
    if (line) lines.push(line)
    line = words[i]
    if (lines.length === max) break
  }
  if (line && lines.length < max) lines.push(line)
  const rest = lines.join(' ').length < words.join(' ').length
  return lines.map((l, i) => (i === lines.length - 1 && (rest || measure(l) > width) ? ellipsize(l, width, measure) : l))
}
function ellipsize(text, width, measure) {
  let s = text
  while (s && measure(s + '…') > width) s = s.slice(0, -1)
  return s.trimEnd() + '…'
}

/**
 * Where everything goes. `measure(text, weight, size)` returns a width in pixels — the canvas's
 * measureText in the app, a fake in the tests. `rtl` mirrors the card for Arabic: text anchors
 * at the right edge and the trophy sits to the right of its line. Returns the canvas size and a
 * flat list of items for drawWorkoutCard; an item carries its size and weight, the font family is
 * the drawer's.
 */
export function layoutWorkoutCard(model, { measure, rtl = false, width = CARD_WIDTH }) {
  const items = []
  const inner = width - PAD * 2
  const start = rtl ? width - PAD : PAD
  const dir = rtl ? -1 : 1
  let y = PAD
  const text = (str, size, weight, color, x = start) => {
    items.push({ kind: 'text', text: str, x, y: y + size, size, weight, color })
    y += Math.round(size * 1.3)
  }

  items.push({ kind: 'bar', x: start, y, w: 96 * dir, h: 10 })
  y += 10 + 56
  for (const line of wrapText(model.title, inner, s => measure(s, 700, 76), TITLE_LINES)) text(line, 76, 700, 'label')
  if (model.date) { y += 8; text(model.date, 40, 400, 'label2') }
  y += 40
  for (const line of wrapText(model.facts.join(' · '), inner, s => measure(s, 600, 46), 2)) text(line, 46, 600, 'label')

  if (model.records.length) {
    y += 56
    text(t('New personal records'), 36, 600, 'acc')
    y += 12
    const icon = 44
    const indent = icon + 22
    const shown = model.records.length > MAX_RECORDS ? model.records.slice(0, MAX_RECORDS - 1) : model.records
    for (const name of shown) {
      items.push({ kind: 'trophy', x: rtl ? start - icon : start, y: y + 4, size: icon })
      const [line] = wrapText(name, inner - indent, s => measure(s, 500, 42), 1)
      text(line, 42, 500, 'label', start + indent * dir)
      y += 14
    }
    if (shown.length < model.records.length) text(t('and {0} more', model.records.length - shown.length), 38, 400, 'label2', start + indent * dir)
  }

  y += 64
  const height = Math.max(MIN_HEIGHT, y + 34 + PAD)
  items.push({ kind: 'text', text: 'openGym', x: start, y: height - PAD, size: 34, weight: 700, color: 'acc' })
  return { width, height, rtl, items }
}

// The trophy from components/Icon.jsx, on its 24×24 grid, so the card and the app agree.
const TROPHY = [
  'M7.6 4h8.8v4.6a4.4 4.4 0 0 1-8.8 0Z',
  'M7.6 5.6H4.9v1.5a3 3 0 0 0 2.9 3M16.4 5.6h2.7v1.5a3 3 0 0 1-2.9 3M12 13v3.4M8.6 20.4h6.8l-.7-4H9.3Z',
]
export const CARD_FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,system-ui,sans-serif"

/**
 * Paint a layout. `colors` holds bg, surface, label, label2 and acc as CSS colours — the app's
 * current theme and accent, read off the root element by the caller.
 */
export function drawWorkoutCard(ctx, layout, colors, family = CARD_FONT) {
  const { width, height, rtl, items } = layout
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, width, height)
  const inset = 36
  ctx.fillStyle = colors.surface
  roundRect(ctx, inset, inset, width - inset * 2, height - inset * 2, 48)
  ctx.fill()
  ctx.direction = rtl ? 'rtl' : 'ltr'
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
  for (const item of items) {
    if (item.kind === 'bar') {
      ctx.fillStyle = colors.acc
      roundRect(ctx, Math.min(item.x, item.x + item.w), item.y, Math.abs(item.w), item.h, item.h / 2)
      ctx.fill()
    } else if (item.kind === 'trophy') {
      ctx.save()
      ctx.translate(item.x, item.y)
      ctx.scale(item.size / 24, item.size / 24)
      ctx.strokeStyle = colors.acc
      ctx.lineWidth = 1.7
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const d of TROPHY) ctx.stroke(new Path2D(d))
      ctx.restore()
    } else {
      ctx.fillStyle = colors[item.color] || colors.label
      ctx.font = `${item.weight} ${item.size}px ${family}`
      ctx.fillText(item.text, item.x, item.y)
    }
  }
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
