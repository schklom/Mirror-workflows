import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkForUpdate } from './update.js'

// __APP_VERSION__ is defined at build time by vite.config.js (reads package.json).
// In the test environment vitest applies the same define, so it's available here.

describe('checkForUpdate', () => {
  let originalFetch

  beforeEach(() => { originalFetch = globalThis.fetch })
  afterEach(() => { globalThis.fetch = originalFetch })

  function mockFetch(body, status = 200) {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }))
  }

  it('reports no update when the latest release matches the current version', async () => {
    mockFetch([{ tag_name: 'v' + __APP_VERSION__, assets: { links: [] } }])
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(false)
    expect(result.latestVersion).toBe(__APP_VERSION__)
    expect(result.apkUrl).toBe(null)
  })

  it('reports no update when the latest release is older than current', async () => {
    mockFetch([{ tag_name: 'v0.0.1', assets: { links: [] } }])
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(false)
    expect(result.latestVersion).toBe('0.0.1')
  })

  it('reports an update when the latest release is newer', async () => {
    mockFetch([{ tag_name: 'v99.0.0', assets: { links: [] } }])
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(true)
    expect(result.latestVersion).toBe('99.0.0')
  })

  it('strips the v prefix from the tag name', async () => {
    mockFetch([{ tag_name: 'v99.1.2', assets: { links: [] } }])
    const result = await checkForUpdate()
    expect(result.latestVersion).toBe('99.1.2')
  })

  it('handles tag names without a v prefix', async () => {
    mockFetch([{ tag_name: '99.0.0', assets: { links: [] } }])
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(true)
    expect(result.latestVersion).toBe('99.0.0')
  })

  it('finds the APK download URL from release asset links', async () => {
    const apkUrl = 'https://gitlab.com/project/-/releases/v2.0.0/downloads/opengym.apk'
    mockFetch([{
      tag_name: 'v99.0.0',
      assets: { links: [{ url: apkUrl, direct_asset_url: apkUrl }] }
    }])
    const result = await checkForUpdate()
    expect(result.apkUrl).toBe(apkUrl)
  })

  it('prefers direct_asset_url over url for APK links', async () => {
    mockFetch([{
      tag_name: 'v99.0.0',
      assets: {
        links: [{
          url: 'https://redirect.example/opengym.apk',
          direct_asset_url: 'https://direct.example/opengym.apk'
        }]
      }
    }])
    const result = await checkForUpdate()
    expect(result.apkUrl).toBe('https://direct.example/opengym.apk')
  })

  it('returns null apkUrl when no .apk link exists', async () => {
    mockFetch([{
      tag_name: 'v99.0.0',
      assets: { links: [{ url: 'https://example.com/changelog.md', direct_asset_url: 'https://example.com/changelog.md' }] }
    }])
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(true)
    expect(result.apkUrl).toBe(null)
  })

  it('returns no update when the releases array is empty', async () => {
    mockFetch([])
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(false)
    expect(result.latestVersion).toBe(__APP_VERSION__)
  })

  it('throws when the API responds with an error status', async () => {
    mockFetch(null, 500)
    await expect(checkForUpdate()).rejects.toThrow('GitLab API 500')
  })

  it('throws on network failure', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
    await expect(checkForUpdate()).rejects.toThrow('Network error')
  })
})

describe('semver comparison (via checkForUpdate behavior)', () => {
  let originalFetch
  beforeEach(() => { originalFetch = globalThis.fetch })
  afterEach(() => { globalThis.fetch = originalFetch })

  function mockRelease(tag) {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve([{ tag_name: tag, assets: { links: [] } }]),
    }))
  }

  // __APP_VERSION__ is "1.2.11" — test that patch, minor, and major bumps are detected
  it('detects a patch bump as an update', async () => {
    mockRelease('v1.2.12')
    expect((await checkForUpdate()).hasUpdate).toBe(true)
  })

  it('detects a minor bump as an update', async () => {
    mockRelease('v1.3.0')
    expect((await checkForUpdate()).hasUpdate).toBe(true)
  })

  it('detects a major bump as an update', async () => {
    mockRelease('v2.0.0')
    expect((await checkForUpdate()).hasUpdate).toBe(true)
  })

  it('does not flag an older patch as an update', async () => {
    mockRelease('v1.2.10')
    expect((await checkForUpdate()).hasUpdate).toBe(false)
  })

  it('does not flag an older minor as an update', async () => {
    mockRelease('v1.1.99')
    expect((await checkForUpdate()).hasUpdate).toBe(false)
  })
})
