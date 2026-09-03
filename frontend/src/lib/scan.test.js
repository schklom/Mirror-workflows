import { describe, it, expect } from 'vitest'
import { scanCode, importCodeFromImage } from './scan.js'

// In the test environment VITE_MOBILE is unset, so MOBILE is false — the same as a web build.
// Both capture paths must refuse to run there rather than reach for a native plugin that isn't
// present. (The happy-path decoding is exercised on-device; here we pin the guard that keeps the
// scanner out of every non-mobile build.)

describe('scan guards off mobile', () => {
  it('scanCode rejects when not in the mobile build', async () => {
    await expect(scanCode()).rejects.toThrow(/only available in the app/)
  })

  it('importCodeFromImage rejects when not in the mobile build', async () => {
    const fakeFile = new Blob(['x'], { type: 'image/png' })
    await expect(importCodeFromImage(fakeFile)).rejects.toThrow(/only available in the app/)
  })
})
