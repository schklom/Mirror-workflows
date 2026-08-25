import { describe, expect, it } from 'vitest'
import { parseWorkoutCSV } from './import-csv.js'

const CSV = [
  'Date,Exercise,Weight,Reps,Set Type',
  '2026-08-08,Bench Press,100,5,Warm-up',
  '2026.08.08,Bench Press,80,5,Working',
  '8 Aug 2026,Bench Press,80,5,Working',
  '2026/08/08,Bench Press,85,3,Working',
].join('\n')

describe('CSV warm-up provenance', () => {
  it('retains the imported warm-up phase and excludes it from topW', () => {
    const parsed = parseWorkoutCSV(CSV, { unit: 'kg' })
    const entry = parsed.workouts[0].entries[0]

    expect(parsed.warmups).toBe(1)
    expect(entry.sets).toEqual([
      { w: 100, r: 5, done: true, phase: 'warmup' },
      { w: 80, r: 5, done: true },
      { w: 80, r: 5, done: true },
      { w: 85, r: 3, done: true },
    ])
    expect(entry.topW).toBe(85)
  })
})

// gravl writes its units in parentheses ("Weight (kg)", "Set Duration (sec)"). Header text is
// normalised before it is matched, so the alias table has to hold the normalised form — an alias
// written with the parentheses can never match. Sample rows are from the gravl export in !21.
const GRAVL = [
  'Date,Start Date,Workout,Source,Workout Duration (min),Energy,Exercise,Superset,Set,Set Type,Reps,Weight (kg),Distance (km),Set Duration (sec),Incline,Steps,Effort,Workout Notes',
  '2026/01/01,1:11 PM,Push Day,,11,11,Chin Up,No,1,Normal,11,11,0,,,,Ideal,felt strong',
  '2026/01/22,2:22 PM,External Something,APP,21,22,Walking,No,0,Normal,0,0,0,22,,,,',
].join('\n')

describe('gravl export', () => {
  it('reads slash dates, parenthesised weight and per-set duration', () => {
    const parsed = parseWorkoutCSV(GRAVL, { unit: 'kg' })

    expect(parsed.skipped).toBe(0)
    expect(parsed.from).toBe('2026-01-01')
    expect(parsed.to).toBe('2026-01-22')

    const [lift, cardio] = parsed.workouts
    expect(lift.name).toBe('Push Day')
    expect(lift.entries[0].sets).toEqual([{ w: 11, r: 11, done: true }])

    // "Set Duration (sec)" is seconds, not minutes: read as `time` it would land as 22 minutes.
    expect(cardio.entries[0].sets).toEqual([{ min: 0.4, speed: 0, done: true }])
  })
})
