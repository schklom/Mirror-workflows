// @vitest-environment happy-dom

/* A server behind Cloudflare Access: the phone's service token goes along on every request to the
   paired server — the pairing itself included — and on nothing else. */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./mobile.js', () => ({ MOBILE: true }))
const backing = new Map()
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    get: async k => (backing.has(k) ? backing.get(k) : null),
    set: async (k, v) => { backing.set(k, v) },
    remove: async k => { backing.delete(k) }
  }
}))

import { api, pairRedeem, setRemoteAuth } from './api.js'
import { accessHeaders, loadCfAccess, saveCfAccess } from './cf-access.js'

const ok = body => vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }))

afterEach(async () => { vi.unstubAllGlobals(); setRemoteAuth('', null); await saveCfAccess({}) })

describe('accessHeaders', () => {
  it('needs both halves, trimmed', () => {
    expect(accessHeaders({ clientId: ' id.access ', clientSecret: ' s3cret ' }))
      .toEqual({ 'CF-Access-Client-Id': 'id.access', 'CF-Access-Client-Secret': 's3cret' })
    expect(accessHeaders({ clientId: 'id', clientSecret: '' })).toEqual({})
    expect(accessHeaders(null)).toEqual({})
  })
})

describe('the Cloudflare Access token on the phone', () => {
  it('goes with the pairing request', async () => {
    const fetch = ok({ token: 'T', user: { id: 'u' } })
    vi.stubGlobal('fetch', fetch)
    await saveCfAccess({ clientId: 'id', clientSecret: 'secret' })
    await pairRedeem('https://gym.example.com', 'ABCD')
    expect(fetch.mock.calls[0][1].headers).toMatchObject({ 'CF-Access-Client-Id': 'id', 'CF-Access-Client-Secret': 'secret' })
  })

  it('goes with every api() call to the paired server, beside the pairing token', async () => {
    const fetch = ok({ rev: 1 })
    vi.stubGlobal('fetch', fetch)
    await saveCfAccess({ clientId: 'id', clientSecret: 'secret' })
    setRemoteAuth('https://gym.example.com', 'TOKEN')
    await api('/api/data/rev')
    expect(fetch.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer TOKEN', 'CF-Access-Client-Id': 'id', 'CF-Access-Client-Secret': 'secret'
    })
  })

  it('survives a restart and is gone once removed', async () => {
    await saveCfAccess({ clientId: 'id', clientSecret: 'secret' })
    expect(await loadCfAccess()).toEqual({ clientId: 'id', clientSecret: 'secret' })
    await saveCfAccess({ clientId: '', clientSecret: '' })
    expect(await loadCfAccess()).toBe(null)
    const fetch = ok({ rev: 1 })
    vi.stubGlobal('fetch', fetch)
    setRemoteAuth('https://gym.example.com', 'TOKEN')
    await api('/api/data/rev')
    expect(fetch.mock.calls[0][1].headers['CF-Access-Client-Id']).toBeUndefined()
  })
})
