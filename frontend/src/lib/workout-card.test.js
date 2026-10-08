import { describe, expect, it } from 'vitest'
import { workoutCardModel, layoutWorkoutCard, wrapText, MAX_RECORDS, CARD_WIDTH } from './workout-card.js'
import { fmtDate } from './format.js'

// #453: a finished workout shared as a picture. A fake measure stands in for the canvas — every
// character is half its font size wide — so the layout can be checked without one.
const measure = (text, weight, size) => String(text).length * size * 0.5

describe('workoutCardModel', () => {
  const names = { bench: 'barbell bench press', curl: 'dumbbell curl', lunge: 'dumbbell lunge' }
  const nameOf = e => names[e.id] || e.id
  const w = {
    id: 'w1', d: '2026-09-03', start: 0, end: 58 * 60000, name: 'Push', vol: 1790,
    prs: ['curl', 'bench', 'curl'],
    entries: [
      { id: 'bench', target: { mode: 'reps' }, sets: [
        { w: 40, r: 8, done: true, phase: 'warmup' },
        { w: 60, r: 8, done: true },
        { w: 60, r: 6, done: true },
        { w: 60, r: 8, done: false },
      ] },
      { id: 'curl', target: { mode: 'reps' }, sets: [{ w: 12, r: 10, done: true }] },
      { id: 'lunge', target: { mode: 'reps', side: true }, sets: [
        { w: 10, r: 16, done: true, sides: { L: { w: 10, r: 8, done: true }, R: { w: 10, r: 8, done: true } } },
      ] },
    ],
  }

  it('says the name, the dated day, duration, work sets and volume', () => {
    const m = workoutCardModel(w, { unit: 'kg', nameOf })
    expect(m.title).toBe('Push')
    expect(m.date).toBe(fmtDate('2026-09-03', true, true))
    // 2 bench work sets (the warm-up and the unticked set are not counted), 1 curl, and the
    // per-side lunge set once per side.
    expect(m.facts).toEqual(['58 min', '5 sets', '1,790 kg'])
  })

  it('lists each new best once, in the order the workout lists the exercises, title-cased', () => {
    expect(workoutCardModel(w, { unit: 'kg', nameOf }).records).toEqual(['Barbell Bench Press', 'Dumbbell Curl'])
  })

  it('leaves out a duration it does not know and works the volume out when none was saved', () => {
    const imported = { ...w, start: undefined, end: undefined, vol: undefined, prs: undefined }
    const m = workoutCardModel(imported, { unit: 'lb', nameOf })
    // 60×8 + 60×6 bench, 12×10 curl, 10×8 a side on the lunge; the warm-up adds nothing.
    expect(m.facts).toEqual(['5 sets', '1,120 lb'])
    expect(m.records).toEqual([])
  })
})

describe('wrapText', () => {
  const width = 100
  const m = s => s.length * 10

  it('keeps a line that fits as it is', () => {
    expect(wrapText('Leg day', width, m, 2)).toEqual(['Leg day'])
  })

  it('wraps at words and cuts the last line with an ellipsis when it runs out of lines', () => {
    const lines = wrapText('upper body strength and conditioning', width, m, 2)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('upper body')
    expect(lines[1].endsWith('…')).toBe(true)
    for (const line of lines) expect(m(line)).toBeLessThanOrEqual(width)
  })

  it('cuts a single word wider than the line instead of overflowing', () => {
    const [line] = wrapText('Oberkörpertrainingseinheit', width, m, 1)
    expect(line.endsWith('…')).toBe(true)
    expect(m(line)).toBeLessThanOrEqual(width)
  })
})

describe('layoutWorkoutCard', () => {
  const model = { title: 'Push', date: 'Thu, 3 Sep 2026', facts: ['58 min', '5 sets', '1,790 kg'], records: ['Barbell Bench Press'] }
  const texts = layout => layout.items.filter(i => i.kind === 'text').map(i => i.text)

  it('stacks the title, date, facts, records and the openGym footer, top to bottom', () => {
    const layout = layoutWorkoutCard(model, { measure })
    expect(layout.width).toBe(CARD_WIDTH)
    expect(texts(layout)).toEqual(['Push', 'Thu, 3 Sep 2026', '58 min · 5 sets · 1,790 kg', 'New personal records', 'Barbell Bench Press', 'openGym'])
    const ys = layout.items.filter(i => i.kind === 'text').map(i => i.y)
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
    expect(layout.items.filter(i => i.kind === 'trophy')).toHaveLength(1)
    expect(Math.max(...ys)).toBeLessThan(layout.height)
  })

  it('keeps every line inside the card', () => {
    const long = { ...model, title: 'A very long routine name that will never fit on one line of the card at all', records: ['an exercise with a name far too long to fit on one line of the card'] }
    const layout = layoutWorkoutCard(long, { measure })
    for (const item of layout.items.filter(i => i.kind === 'text')) {
      expect(item.x + measure(item.text, item.weight, item.size), item.text).toBeLessThanOrEqual(layout.width)
    }
  })

  it('counts the new bests past the limit instead of growing without end', () => {
    const many = { ...model, records: Array.from({ length: 9 }, (_, i) => 'lift ' + i) }
    const layout = layoutWorkoutCard(many, { measure })
    expect(layout.items.filter(i => i.kind === 'trophy')).toHaveLength(MAX_RECORDS - 1)
    expect(texts(layout)).toContain('and 4 more')
  })

  it('leaves the records section out when there are none', () => {
    const layout = layoutWorkoutCard({ ...model, records: [] }, { measure })
    expect(texts(layout)).not.toContain('New personal records')
    expect(layout.items.some(i => i.kind === 'trophy')).toBe(false)
  })

  it('mirrors for a right-to-left language: lines start at the right edge', () => {
    const ltr = layoutWorkoutCard(model, { measure })
    const rtl = layoutWorkoutCard(model, { measure, rtl: true })
    expect(rtl.rtl).toBe(true)
    const title = l => l.items.find(i => i.text === 'Push')
    expect(title(rtl).x).toBe(rtl.width - title(ltr).x)
    const trophy = l => l.items.find(i => i.kind === 'trophy')
    expect(trophy(rtl).x).toBeGreaterThan(rtl.width / 2)
  })
})
