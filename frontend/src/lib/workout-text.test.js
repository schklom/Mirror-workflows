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
