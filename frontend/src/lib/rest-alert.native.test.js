// The Capacitor side of the rest alert (#296). The iOS app has no RestAlert plugin, and the
// listener this file adds at startup used to reject there with nothing to catch it. On Android
// the plugin is a Capacitor proxy that answers `then` with a native call that never settles, so
// it must never become the value of a promise (the Coach hang, #42): here that would hang every
// rest alert call.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  vi.stubEnv('VITE_MOBILE', '1')   // lib/mobile.js: MOBILE = import.meta.env.VITE_MOBILE === '1'
  return { platform: 'android', calls: [], registerPlugin: null }
})

// Shaped like the proxy registerPlugin() returns: every property is a native method, `then`
// included, and that one never calls back. Off Android every method rejects, as Capacitor's do
// for a plugin the platform does not have.
const pluginProxy = () => new Proxy({}, {
  get: (_, prop) => {
    if (prop === 'then') return () => new Promise(() => {})
    return (...args) => {
      h.calls.push(String(prop))
      if (h.platform !== 'android') return Promise.reject(new Error(`"RestAlert.${String(prop)}()" is not implemented on ${h.platform}`))
      return Promise.resolve(prop === 'addListener' ? { remove: async () => {} } : undefined)
    }
  },
})

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => h.platform },
  registerPlugin: (...args) => h.registerPlugin(...args),
}))
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: async () => ({ display: 'granted' }),
    requestPermissions: async () => ({ display: 'granted' }),
  },
}))

const settle = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setTimeout(r, 0)) }

const unhandled = []
const onUnhandled = reason => unhandled.push(reason)

beforeEach(() => {
  vi.resetModules()
  h.calls = []
  h.registerPlugin = vi.fn(() => pluginProxy())
  unhandled.length = 0
  process.on('unhandledRejection', onUnhandled)
})
afterAll(() => {
  process.off('unhandledRejection', onUnhandled)
  vi.unstubAllEnvs()
})

describe('the rest alert in the iOS app', () => {
  it('registers nothing, rejects nothing and leaves the end to the server push', async () => {
    h.platform = 'ios'
    const alert = await import('./rest-alert.js')
    await expect(alert.armRestAlert(Date.now() + 90_000, { totalSec: 90 })).resolves.toBe(false)
    alert.setRestAccent('red')
    alert.disarmRestAlert()
    await settle()
    expect(h.registerPlugin).not.toHaveBeenCalled()
    expect(h.calls).toEqual([])
    expect(unhandled).toEqual([])
  })
})

describe('the rest alert in the Android app', () => {
  it('reaches the plugin without ever waiting on the proxy, and registers it once', async () => {
    h.platform = 'android'
    const alert = await import('./rest-alert.js')
    await expect(alert.armRestAlert(Date.now() + 90_000, { totalSec: 90 })).resolves.toBe(true)
    alert.setRestAccent('red')
    alert.disarmRestAlert()
    await settle()
    expect(h.registerPlugin).toHaveBeenCalledTimes(1)
    expect(h.calls).toContain('addListener')
    expect(h.calls.filter(c => c !== 'addListener')).toEqual(['schedule', 'setAccent', 'cancel'])
    expect(unhandled).toEqual([])
  })

  it('passes what the notification needs: the end, the whole rest, the labels and the accent', async () => {
    h.platform = 'android'
    const schedule = vi.fn(async () => {})
    h.registerPlugin = vi.fn(() => new Proxy({}, {
      get: (_, prop) => prop === 'then' ? () => new Promise(() => {}) : prop === 'schedule' ? schedule : async () => ({ remove: async () => {} }),
    }))
    const alert = await import('./rest-alert.js')
    const at = Date.now() + 90_000
    await alert.armRestAlert(at, { totalSec: 90, accent: 'red', sound: false })
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({
      at, totalMs: 90_000, sound: false, pause: 'Pause', resume: 'Resume', skip: 'Skip',
      accent: (0xff000000 | 0xff453a) >>> 0, ink: 0xffffffff,
    }))
  })
})
