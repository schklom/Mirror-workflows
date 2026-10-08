import { describe, expect, it } from 'vitest'
import { ACCESSORIES, ALL_EQUIPMENT } from './equipment.js'
import { isLoadedEq } from './exercises.js'

// Issue #393: clubbell and macebell are real loaded tools with no catalogue entries yet.
describe('clubbell and macebell', () => {
  it('appends both to the equipment list when the catalogue does not use them', () => {
    // …after every catalogue value, and before the accessories (bench, pull-up bar), which close the list.
    const end = ALL_EQUIPMENT.length - ACCESSORIES.length
    expect(ALL_EQUIPMENT.slice(end - 2, end)).toEqual(['clubbell', 'macebell'])
    expect(ALL_EQUIPMENT.slice(end)).toEqual(ACCESSORIES)
  })

  it('treats a set on either as a loaded set', () => {
    expect(isLoadedEq({ eq: 'clubbell' })).toBe(true)
    expect(isLoadedEq({ eq: 'macebell' })).toBe(true)
    expect(isLoadedEq({ eq: 'kettlebell' })).toBe(true)
  })
})
