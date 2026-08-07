import { describe, expect, it } from 'vitest'
import { guestAllowed } from './guest.js'

// The flag is the easy half. The half worth pinning down is what happens when the server did not
// answer: a failed config fetch must not be read as "guests are disabled", or an instance that is
// merely unreachable locks out everyone who never made an account (#42).
describe('guestAllowed', () => {
  it('allows guests when the server says so', () => {
    expect(guestAllowed({ allow_guest: true })).toBe(true)
  })

  it('refuses guests only on an explicit false', () => {
    expect(guestAllowed({ allow_guest: false })).toBe(false)
  })

  it('allows guests when the config could not be fetched', () => {
    expect(guestAllowed(null)).toBe(true)
    expect(guestAllowed(undefined)).toBe(true)
  })

  it('allows guests against a server too old to send the flag', () => {
    expect(guestAllowed({ invite_only: true })).toBe(true)
  })

  // A missing key and a falsy-but-not-false value are different things. Only `false` — what the
  // server actually serialises — closes the door; anything else stays open rather than guessing.
  it('does not treat other falsy values as a refusal', () => {
    for (const v of [0, '', null, undefined, NaN]) {
      expect(guestAllowed({ allow_guest: v })).toBe(true)
    }
  })

  it('treats the string "false" as the misconfiguration it is, not as a refusal', () => {
    expect(guestAllowed({ allow_guest: 'false' })).toBe(true)
  })
})
