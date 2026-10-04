// @vitest-environment happy-dom
// #329: pairing failed with nothing but "Failed to fetch" — the same words for a wrong address
// and for a reverse proxy that answered the CORS preflight itself and kept the app out. A
// no-cors probe of /api/health tells the two apart, and the message says which.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pairRedeem } from './api.js'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

const failed = () => Promise.reject(new TypeError('Failed to fetch'))
const opaque = () => Promise.resolve(new Response(null, { status: 200 }))

describe('pairRedeem when the request never gets an answer', () => {
  it('server reachable without CORS: says the proxy refused the app, naming the app\'s origin', async () => {
    const fetch = vi.fn((url, init) => (url.endsWith('/api/pair/redeem') ? failed() : opaque()))
    vi.stubGlobal('fetch', fetch)
    const e = await pairRedeem('https://gym.example.com', 'ABCD2345').catch(x => x)
    expect(e.code).toBe('cors')
    expect(e.message).toContain('CORS')
    expect(e.message).toContain(location.origin)
    expect(e.message).toContain('SELF_HOSTING.md')
    const probe = fetch.mock.calls[1]
    expect(probe[0]).toBe('https://gym.example.com/api/health')
    expect(probe[1]).toMatchObject({ mode: 'no-cors', cache: 'no-store' })
  })

  it('server not reachable at all: says so, with the address', async () => {
    vi.stubGlobal('fetch', vi.fn(failed))
    const e = await pairRedeem('https://gym.example.com/sub/', 'ABCD2345').catch(x => x)
    expect(e.code).toBe('unreachable')
    expect(e.message).toBe('Could not reach gym.example.com/sub. Check the address and that this phone can reach it.')
  })

  it('a probe that hangs counts as not reachable', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => (url.endsWith('/api/pair/redeem') ? failed() : new Promise(() => {}))))
    const e = await pairRedeem('https://gym.example.com', 'ABCD2345', { probeMs: 20 }).catch(x => x)
    expect(e.code).toBe('unreachable')
  })

  it('an answer from the server is passed on as it is, with no probe', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'invalid or expired code' }), { status: 400, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(pairRedeem('https://gym.example.com', 'ABCD2345')).rejects.toMatchObject({ status: 400, message: 'invalid or expired code' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('a timeout stays a timeout', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetch)
    const p = pairRedeem('https://gym.example.com', 'ABCD2345').catch(x => x)
    await vi.advanceTimersByTimeAsync(21000)
    const e = await p
    expect(e.code).toBe('timeout')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
