import { describe, expect, it } from 'vitest'
import { workoutText } from './workout-text.js'
import { fmtDate } from './format.js'

// Discord 'Improvement ideas': a past workout copied as plain text to paste anywhere.
describe('workoutText', () => {
  const names = { bench: 'barbell bench press', curl: 'dumbbell curl', pushdown: 'cable pushdown', run: 'run' }
  const nameOf = e => names[e.id] || e.id
  const w = {
    id: 'w1', d: '2026-09-03', start: 0, end: 58 * 60000, name: 'Push', vol: 1790, bw: 80,
    note: 'Felt strong.',
    entries: [
      { id: 'bench', target: { mode: 'reps' }, note: 'narrower grip', sets: [
        { w: 40, r: 8, done: true, phase: 'warmup' },
        { w: 60, r: 8, done: true },
        { w: 60, r: 6, done: true, type: 'dropset', drops: [{ w: 45, r: 6 }] },
        { w: 60, r: 8, done: false },
      ] },
      { id: 'curl', sg: 'sg1', target: { mode: 'reps' }, sets: [{ w: 12, r: 10, done: true }] },
      { id: 'pushdown', sg: 'sg1', target: { mode: 'reps' }, sets: [{ w: 20, r: 12, done: true }] },
      { id: 'run', target: { mode: 'cardio' }, sets: [{ min: 20, speed: 10, done: true }] },
    ],
  }

  it('reads as the heading, each exercise with its work sets, supersets together, then the note', () => {
    expect(workoutText(w, { unit: 'kg', nameOf })).toBe([
      `Push — ${fmtDate('2026-09-03', true, true)}`,
      '58 min · 1,790 kg · Body weight 80 kg',
      '',
      'Barbell Bench Press',
      '60×8, 60×6 ↘ 45×6',
      'narrower grip',
      '',
      'Superset',
      'Dumbbell Curl',
      '12×10',
      'Cable Pushdown',
      '20×12',
      '',
      'Run',
      '20 min @ 10 km/h',
      '',
      'Felt strong.',
    ].join('\n'))
  })

  it('leaves out what was not trained and what was never recorded', () => {
    const bare = { d: '2026-09-03', start: 5, end: 5, name: 'Legs', entries: [
      { id: 'bench', target: { mode: 'reps' }, sets: [{ w: 40, r: 8, done: true, phase: 'warmup' }] },
      { id: 'curl', sg: 'sg1', target: { mode: 'reps' }, sets: [{ w: 12, r: 10, done: true }] },
      { id: 'pushdown', sg: 'sg1', target: { mode: 'reps' }, sets: [{ w: 20, r: 12, done: false }] },
    ] }
    // no clock, no weigh-in, no note; an exercise with only a warm-up drops out, and a superset
    // with one member left trained is just that exercise
    expect(workoutText(bare, { unit: 'lb', nameOf })).toBe(`Legs — ${fmtDate('2026-09-03', true, true)}\n120 lb\n\nDumbbell Curl\n12×10`)
  })
})

// A combined session can pair the last exercise of one routine with the first of the next. The
// detail sheet splits the workout by routine first and shows those two apart, each in its own
// section; the copied text paired them over the flat list and wrote "Superset" above them.
describe('workoutText in a combined session', () => {
  const nameOf = e => e.id
  const row = (id, rid, sg) => ({ id, rid, ...(sg ? { sg } : {}), target: { mode: 'reps' }, sets: [{ w: 20, r: 10, done: true }] })
  const at = entries => ({ d: '2026-09-03', start: 0, end: 0, name: 'Push + Pull', vol: 0, routineIds: ['A', 'B'], entries })

  it('pairs a superset only inside one routine\'s section, as the detail sheet does', () => {
    const text = workoutText(at([row('press', 'A'), row('fly', 'A', 'x'), row('row', 'B', 'x'), row('curl', 'B')]), { unit: 'kg', nameOf })
    expect(text).not.toContain('Superset')
    expect(text.split('\n\n').slice(1)).toEqual(['Press\n20×10', 'Fly\n20×10', 'Row\n20×10', 'Curl\n20×10'])
  })

  it('keeps a superset inside one routine together, and lists each routine\'s exercises in its section', () => {
    // the curl was added to routine A late in the session, after routine B's exercises
    const text = workoutText(at([row('press', 'A', 'y'), row('fly', 'A', 'y'), row('row', 'B'), row('curl', 'A')]), { unit: 'kg', nameOf })
    expect(text.split('\n\n').slice(1)).toEqual(['Superset\nPress\n20×10\nFly\n20×10', 'Curl\n20×10', 'Row\n20×10'])
  })
})

// Cardio speed in the profile's unit, as the detail sheet above the button shows it (lib/speed.js).
describe('workoutText speed unit', () => {
  it('writes a run in mph when the profile shows mph, and in km/h by default', () => {
    const w = { d: '2026-09-03', start: 0, end: 0, name: 'Run', entries: [
      { id: 'run', target: { mode: 'cardio' }, sets: [{ min: 20, speed: 16.09344, done: true }] },
    ] }
    const nameOf = () => 'run'
    expect(workoutText(w, { unit: 'lb', nameOf, speedUnit: 'mph' }).split('\n').at(-1)).toBe('20 min @ 10 mph')
    expect(workoutText(w, { unit: 'kg', nameOf }).split('\n').at(-1)).toBe('20 min @ 16.1 km/h')
  })
})
