// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

/* The sheet a sign-out shows when the server is missing something names the photos and videos
   that have not reached it, offers the backup that carries them, and its "Try again" sends them
   too. */
const mocks = vi.hoisted(() => ({
  sync: { status: 'offline', lastError: { status: 0, code: 'network' } },
  syncNow: null, signOut: null, syncMedia: null
}))
vi.mock('../store/useStore.js', () => {
  const snap = () => ({ sync: mocks.sync, syncNow: mocks.syncNow, signOut: mocks.signOut, config: null })
  const useStore = selector => (selector ? selector(snap()) : snap())
  useStore.getState = snap
  return { useStore }
})
vi.mock('../store/useUI.js', () => {
  const snap = () => ({ toast: vi.fn(), openSheet: vi.fn() })
  const useUI = selector => (selector ? selector(snap()) : snap())
  useUI.getState = snap
  return { useUI }
})
vi.mock('../lib/media-sync.js', () => ({ syncMedia: (...a) => mocks.syncMedia(...a) }))
vi.mock('../lib/api.js', () => ({ passkeyLogin: vi.fn(), webauthnOK: () => true }))
vi.mock('../sheets.jsx', () => ({ askAddDeviceData: vi.fn() }))
vi.mock('../views/MobileOnboarding.jsx', () => ({ ConnectSheet: () => null }))

const { OwedSheet } = await import('./ServerSync.jsx')

let host, root
beforeEach(() => {
  mocks.syncNow = vi.fn(async () => mocks.sync)
  mocks.syncMedia = vi.fn(async () => {})
  mocks.signOut = vi.fn(async () => ({ owed: true, count: 0, media: 1 }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const button = text => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text))

describe('OwedSheet with photos and videos waiting', () => {
  it('names them, and exports the backup that carries them', () => {
    const zip = vi.fn(), json = vi.fn()
    act(() => root.render(<OwedSheet kind="signout" count={0} media={2} exportBackup={json} exportBackupZip={zip} done={vi.fn()} close={vi.fn()} />))
    expect(host.textContent).toContain('2 photos or videos have not reached your server yet.')
    expect(host.textContent).not.toContain('Some changes on this device')
    act(() => { button('Export with photos & videos (.zip)').click() })
    expect(zip).toHaveBeenCalledTimes(1)
    expect(json).not.toHaveBeenCalled()
  })

  it('names the changes and the media when both are waiting', () => {
    act(() => root.render(<OwedSheet kind="signout" count={3} media={1} exportBackup={vi.fn()} exportBackupZip={vi.fn()} done={vi.fn()} close={vi.fn()} />))
    expect(host.textContent).toContain('Not on your server yet')
    expect(host.textContent).toContain('1 photos or videos have not reached your server yet.')
  })

  it('Try again sends them too — the refused ones included — and the sheet follows the new count', async () => {
    act(() => root.render(<OwedSheet kind="signout" count={0} media={1} exportBackup={vi.fn()} exportBackupZip={vi.fn()} done={vi.fn()} close={vi.fn()} />))
    mocks.signOut = vi.fn(async () => ({ owed: true, count: 0, media: 1 }))
    mocks.sync = { status: 'pending' }
    await act(async () => { button('Try again').click(); await new Promise(r => setTimeout(r, 0)) })
    expect(mocks.syncMedia).toHaveBeenCalledWith({ force: true, retryRejected: true })
    expect(mocks.signOut).toHaveBeenCalled()
  })

  it('without media, it is the sheet it always was', () => {
    const json = vi.fn()
    act(() => root.render(<OwedSheet kind="signout" count={2} exportBackup={json} done={vi.fn()} close={vi.fn()} />))
    expect(host.textContent).not.toContain('photos or videos')
    act(() => { button('Export backup (JSON)').click() })
    expect(json).toHaveBeenCalled()
  })
})
