// @vitest-environment node

/* The page's half of offline exercise media (#281): which URLs the plan needs, when the
 * connection is one to spend them on, and fetching only what the worker's cache is missing. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { planMediaUrls, prefetchAllowed, prefetchMedia, startMediaPrefetch, MEDIA_CACHE, PREFETCH_DELAY_MS } from './media-prefetch.js'
import { EXIDX, imgSrc, gifSrc } from './exercises.js'

const BASE = 'https://gym.test/app/'
const abs = src => new URL(src, BASE).href
const bench = EXIDX['0025'] || Object.values(EXIDX).find(e => e.gif)
const other = Object.values(EXIDX).find(e => e.gif && e.id !== bench.id)

const answer = (status = 200) => ({ ok: status < 400, status, arrayBuffer: async () => new ArrayBuffer(1) })
const cacheWith = urls => ({ match: async u => (urls.includes(u) ? {} : undefined) })

afterEach(() => { vi.useRealTimers() })

describe('planMediaUrls', () => {
  it('names the still and the animation of every exercise in the plan and the session in progress, once each', () => {
    const S = {
      routines: [{ ex: [{ id: bench.id }, { id: bench.id }] }, { ex: [{ id: 'custom-1' }, {}] }, null],
      active: { entries: [{ id: other.id }, { id: bench.id }] },
    }
    const urls = planMediaUrls(S, BASE, { ...EXIDX, 'custom-1': { id: 'custom-1', n: 'Mine' } })
    expect(urls.sort()).toEqual([abs(gifSrc(bench)), abs(imgSrc(bench)), abs(gifSrc(other)), abs(imgSrc(other))].sort())
  })

  it('an empty or missing plan needs nothing', () => {
    expect(planMediaUrls({}, BASE)).toEqual([])
    expect(planMediaUrls(null, BASE)).toEqual([])
    expect(planMediaUrls({ routines: [{ ex: [{ id: bench.id }] }] }, undefined)).toEqual([])
  })

  it('leaves out media a build points at another origin, which never passes through the worker', async () => {
    // The demo build's media comes from a CDN (VITE_IMG_BASE/VITE_GIF_BASE, read at load).
    vi.resetModules()
    vi.stubEnv('VITE_IMG_BASE', 'https://cdn.test/images/')
    vi.stubEnv('VITE_GIF_BASE', 'https://cdn.test/videos/')
    try {
      const fresh = await import('./media-prefetch.js')
      expect(fresh.planMediaUrls({ routines: [{ ex: [{ id: bench.id }] }] }, BASE)).toEqual([])
    } finally { vi.unstubAllEnvs(); vi.resetModules() }
  })
})

describe('prefetchAllowed', () => {
  it('spends data only where the browser does not say it costs something', () => {
    expect(prefetchAllowed({ onLine: true })).toBe(true)                                   // Safari, Firefox: no word
    expect(prefetchAllowed({ onLine: true, connection: { type: 'wifi', effectiveType: '4g' } })).toBe(true)
    expect(prefetchAllowed({ onLine: false })).toBe(false)
    expect(prefetchAllowed({ onLine: true, connection: { saveData: true, type: 'wifi' } })).toBe(false)
    expect(prefetchAllowed({ onLine: true, connection: { type: 'cellular', effectiveType: '4g' } })).toBe(false)
    expect(prefetchAllowed({ onLine: true, connection: { effectiveType: '2g' } })).toBe(false)
    expect(prefetchAllowed({ onLine: true, connection: { effectiveType: 'slow-2g' } })).toBe(false)
    expect(prefetchAllowed(undefined)).toBe(false)
  })
})

describe('prefetchMedia', () => {
  it('fetches only what the cache is missing, and reads each answer to the end', async () => {
    const read = vi.fn(async () => new ArrayBuffer(1))
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: read }))
    const r = await prefetchMedia(['a', 'b', 'c'], { cache: cacheWith(['b']), fetchImpl, allowed: () => true })
    expect(fetchImpl.mock.calls.map(c => c[0]).sort()).toEqual(['a', 'c'])
    expect(read).toHaveBeenCalledTimes(2)
    expect(r).toEqual({ wanted: 3, missing: 2, fetched: 2 })
  })

  it('gives up after three refusals in a row, and stops when the connection stops qualifying', async () => {
    const refused = vi.fn(async () => answer(401))
    const urls = [...Array(20)].map((_, i) => 'u' + i)
    const r = await prefetchMedia(urls, { fetchImpl: refused, allowed: () => true })
    expect(refused.mock.calls.length).toBeLessThanOrEqual(4)   // two lanes, one may be mid-flight
    expect(r.fetched).toBe(0)

    let budget = 3
    const ok = vi.fn(async () => answer())
    await prefetchMedia(urls, { fetchImpl: ok, allowed: () => budget-- > 0 })
    expect(ok).toHaveBeenCalledTimes(3)

    const down = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await prefetchMedia(urls, { fetchImpl: down, allowed: () => true })
    expect(down.mock.calls.length).toBeLessThanOrEqual(4)
  })
})

describe('startMediaPrefetch', () => {
  function setup({ controller = {}, S = { routines: [{ ex: [{ id: bench.id }] }] } } = {}) {
    const listeners = new Set()
    const store = { state: { S }, getState: () => store.state, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) } }
    store.set = S => { store.state = { S }; listeners.forEach(fn => fn(store.state)) }
    const cached = []
    const cachesApi = { open: vi.fn(async () => cacheWith(cached)) }
    const nav = { onLine: true, serviceWorker: { controller, addEventListener() {}, removeEventListener() {} } }
    const fetchImpl = vi.fn(async u => { cached.push(u); return answer() })
    vi.stubGlobal('fetch', fetchImpl)
    vi.stubGlobal('location', { href: BASE })
    return { store, cachesApi, nav, fetchImpl, listeners }
  }
  afterEach(() => { vi.unstubAllGlobals() })
  const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }

  it('waits for the app to settle, fetches the plan\'s media through the worker, then only what a plan change adds', async () => {
    vi.useFakeTimers()
    const { store, cachesApi, nav, fetchImpl } = setup()
    const stop = startMediaPrefetch(store, { nav, cachesApi })
    expect(fetchImpl).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(PREFETCH_DELAY_MS)
    await flush()
    expect(cachesApi.open).toHaveBeenCalledWith(MEDIA_CACHE)
    expect(fetchImpl.mock.calls.map(c => c[0]).sort()).toEqual([abs(gifSrc(bench)), abs(imgSrc(bench))].sort())

    // Something unrelated changes: nothing new to fetch.
    store.set({ ...store.state.S, unit: 'lb' })
    await vi.advanceTimersByTimeAsync(PREFETCH_DELAY_MS)
    await flush()
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    // A routine gains an exercise: its two files, and only those.
    store.set({ routines: [{ ex: [{ id: bench.id }, { id: other.id }] }] })
    await vi.advanceTimersByTimeAsync(PREFETCH_DELAY_MS)
    await flush()
    expect(fetchImpl.mock.calls.slice(2).map(c => c[0]).sort()).toEqual([abs(gifSrc(other)), abs(imgSrc(other))].sort())
    stop()
  })

  it('does nothing without a worker in charge of the page, or on a connection that costs', async () => {
    vi.useFakeTimers()
    const a = setup({ controller: null })
    const stopA = startMediaPrefetch(a.store, { nav: a.nav, cachesApi: a.cachesApi })
    await vi.advanceTimersByTimeAsync(PREFETCH_DELAY_MS)
    await flush()
    expect(a.fetchImpl).not.toHaveBeenCalled()
    stopA()

    const b = setup()
    b.nav.connection = { saveData: true }
    const stop = startMediaPrefetch(b.store, { nav: b.nav, cachesApi: b.cachesApi })
    await vi.advanceTimersByTimeAsync(PREFETCH_DELAY_MS)
    await flush()
    expect(b.fetchImpl).not.toHaveBeenCalled()
    stop()

    expect(startMediaPrefetch(b.store, { nav: {}, cachesApi: b.cachesApi })).toBeTypeOf('function')
  })
})
