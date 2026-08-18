import { describe, it, expect } from 'vitest'
import { matchExercise } from './import-csv.js'
import { EXIDX } from './exercises.js'

// The names other apps actually export, and the catalogue entry each has to land on.
// Everything here was reported as arriving in the app as a *custom* exercise (issue #74):
// the alias table is the intended place to fix that, so these pin it.
const MAPS = {
  Treadmill: '3666',
  'Goblet Squat': '1760',
  Cycling: '2331',
  'Cable Core Pallof Press': '0979',
  Elliptical: '2141',
  'Stationary Bike': '2138',
}

describe('foreign exercise names resolve to the catalogue', () => {
  for (const [name, id] of Object.entries(MAPS)) {
    it(`maps "${name}" to ${id}`, () => {
      expect(matchExercise(name)).toBe(id)
      expect(EXIDX[id]).toBeTruthy()   // an alias pointing at a dropped id is worse than no alias
    })
  }

  // Equipment qualifiers must still beat the bare alias, or an import files years of
  // dumbbell work under the barbell lift.
  it('keeps the qualified variants distinct', () => {
    expect(matchExercise('Kettlebell Goblet Squat')).toBe('0534')
    expect(matchExercise('Dumbbell Goblet Squat')).toBe('1760')
  })

  // The word-bag is order-insensitive, which is what lets one alias cover the two ways
  // exporters write the same movement.
  it('ignores word order and case', () => {
    expect(matchExercise('Squat (Barbell)')).toBe(matchExercise('Barbell Squat'))
  })

  // Regression guard for the aliases added above: the common lifts must not have moved.
  it('leaves the established aliases alone', () => {
    expect(matchExercise('Bench Press')).toBe('0025')
    expect(matchExercise('Squat')).toBe('0043')
    expect(matchExercise('Barbell Row')).toBe('0027')
    expect(matchExercise('Deadlift')).toBe('0032')
  })

  it('still refuses to guess', () => {
    expect(matchExercise('Some Movement I Invented')).toBe(null)
    expect(matchExercise('')).toBe(null)
  })
})
