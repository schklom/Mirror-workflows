import { describe, expect, it } from 'vitest'
import { ALL_EQUIPMENT } from './equipment.js'
import { isLoadedEq } from './exercises.js'

// Issue #393: clubbell and macebell are real loaded tools with no catalogue entries yet.
describe('clubbell and macebell', () => {
  it('appends both to the equipment list when the catalogue does not use them', () => {
    expect(ALL_EQUIPMENT.slice(-2)).toEqual(['clubbell', 'macebell'])
  })

  it('treats a set on either as a loaded set', () => {
    expect(isLoadedEq({ eq: 'clubbell' })).toBe(true)
    expect(isLoadedEq({ eq: 'macebell' })).toBe(true)
    expect(isLoadedEq({ eq: 'kettlebell' })).toBe(true)
  })
})
