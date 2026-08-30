import { create } from 'zustand'
import { api, setRemoteAuth } from '../lib/api.js'
import { localTZ } from '../lib/format.js'
import { registerCustom } from '../lib/exercises.js'
import { DEMO, DEMO_SEEDED } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { MOBILE, initReminderSync, nativeLoad, nativeSave, syncReminder, writeAutoBackup } from '../lib/mobile.js'
import { loadRemote, chooseLocal, forgetRemote, connect } from '../lib/remote.js'

const KEY = 'gym_state_v1'
export const DEF = {
  unit: 'kg', restSec: 90, restPauseSec: 15, sound: true, timerFlash: false, keepAwake: true, lang: 'en',
  theme: 'dark', accent: 'lime', body: 'male', targetW: null,
  bodyweight: [], routines: [], week: {}, dayPlan: {},
  exWeights: {}, workouts: [], active: null, customEx: [], gifSize: 'full',
  // effort: which per-set effort scale is logged — 'none' | 'rir' | 'rpe'. null, not 'none', so
  // that a profile which never chose (loaded state is overlaid on DEF, on every path: local,
  // server pull, backup import) still falls back to the `showRir` boolean this replaced and
  // keeps the column it had. See effortOf.
  reminder: { on: false, time: '08:00', tz: null }, effort: null, autoBackup: false,
  // Equipment profiles (issue: filter Library/picker/routines by what you actually own —
  // e.g. "Home" vs "Gym" — building on the session-only equipment filter from issue #6).
  equipProfiles: [], activeEquipId: null, equipFilterOn: false,
}
const clone = o => JSON.parse(JSON.stringify(o))

function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return Object.assign(clone(DEF), JSON.parse(raw))
  } catch (e) { /* ignore */ }
  return clone(DEF)
}

const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length)

// Decide whether a pulled account state may replace the local saved state. A local active workout
// is deliberately carried forward: the server stores completed/saved state, while the in-progress
// session belongs to the device that is currently running it.
export function restoredStateFor(local, remote, dirty = false) {
  if (!remote || (hasData(local) && (dirty || (remote._ts || 0) < (local._ts || 0)))) return null
  const next = Object.assign(clone(DEF), remote)
  if (local.active) next.active = local.active
  return next
}

export const useStore = create((set, get) => {
  let pushTm = null
  let saveTm = null

  initReminderSync(() => get().S)

  // Mobile build: mirror the state into a file in the app's data directory (survives WebView
  // storage eviction) and keep the native reminder schedule in step with the weekly plan.
  const nativePersist = () => {
    clearTimeout(saveTm)
    saveTm = setTimeout(() => { saveTm = null; nativeSave(get().S); syncReminder(get().S) }, 800)
  }

  const persist = (S, push = true) => {
    S._ts = Date.now()
    registerCustom(S.customEx)
    localStorage.setItem(KEY, JSON.stringify(S))
    set({ S })
    if (MOBILE) nativePersist()
    if (push && get().user) {
      clearTimeout(pushTm)
      pushTm = setTimeout(() => get().pushState(), 1500)
    }
  }

  // A setting changed right before switching away/closing the tab must not get lost mid-debounce
  // (e.g. setting the reminder time then immediately backgrounding to test it). On mobile the
  // same applies to the file mirror — backgrounding is often the last thing before the OS
  // kills the app.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    if (MOBILE && saveTm) {
      clearTimeout(saveTm)
      saveTm = null
      nativeSave(get().S)
      syncReminder(get().S)
    }
    if (pushTm) {
      clearTimeout(pushTm)
      pushTm = null
      get().pushState()
    }
  })

  // Everything a sign-out leaves behind on this device, whichever way it was triggered.
  const clearLocalSession = () => {
    get().setUser(null)
    localStorage.removeItem('gym_guest')
    localStorage.removeItem('gym_dirty')
    localStorage.removeItem(KEY)
    persist(clone(DEF), false)
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    user: (() => { try { return JSON.parse(localStorage.getItem('gym_user')) || null } catch { return null } })(),
    ready: false,
    needsMobileOnboarding: false,   // mobile build only — set true by boot() on a genuine first launch

    // Mutate a draft of S via producer fn, then persist + schedule sync.
    update(mut, push = true) {
      const S = clone(get().S)
      mut(S)
      persist(S, push)
    },
    replaceState(S, push = false) { persist(clone(S), push) },

    // Fires after the moments where losing local data would actually hurt — a workout just
    // logged, a routine just edited — not on every keystroke. No-op off mobile or with the
    // setting off; the private file mirror (nativePersist, above) already covers every change.
    autoBackupNow() {
      const S = get().S
      if (MOBILE && S.autoBackup) writeAutoBackup(S)
    },

    isGuest: () => localStorage.getItem('gym_guest') === '1',
    setGuest(v) { if (v) localStorage.setItem('gym_guest', '1'); else localStorage.removeItem('gym_guest'); set({}) },

    // Public config from /api/config (invite_only, allow_guest). null until the first successful
    // fetch — the login screen and boot both read it, so it is fetched once and cached here
    // rather than by each screen that happens to need it.
    config: null,
    async loadConfig() {
      if (get().config) return get().config
      try { const c = await api('/api/config'); set({ config: c }); return c }
      catch { return null }
    },

    setUser(u) {
      if (u) { localStorage.setItem('gym_user', JSON.stringify(u)); localStorage.removeItem('gym_guest') }
      else localStorage.removeItem('gym_user')
      set({ user: u })
    },

    async pushState() {
      if (!get().user) return
      clearTimeout(pushTm)
      try { await api('/api/data', { method: 'PUT', body: JSON.stringify({ state: get().S }) }); localStorage.removeItem('gym_dirty') }
      catch (e) { localStorage.setItem('gym_dirty', '1') }
    },
    async pullState() {
      try {
        const { state } = await api('/api/data')
        const S = get().S
        const dirty = localStorage.getItem('gym_dirty') === '1'
        const restored = restoredStateFor(S, state, dirty)
        if (restored) {
          persist(restored, false)
        } else if (hasData(S)) { await get().pushState() }
      } catch (e) { /* offline — keep local */ }
    },

    async signOut() {
      try { await get().pushState(); await api('/api/logout', { method: 'POST', body: '{}' }) } catch (e) { /* */ }
      clearLocalSession()
    },

    // Mobile-only ("connect to my server" onboarding, see App.jsx's needsMobileOnboarding).
    // Picking local — even before there's any data — persists the choice so onboarding never
    // asks again.
    async chooseLocalMode() {
      await chooseLocal()
      set({ needsMobileOnboarding: false })
    },
    // Redeems the pairing code shown in the browser (Settings → "Pair the mobile app") and
    // switches this device over to that account, same as signing in on the web does.
    async connectToServer(url, code) {
      const user = await connect(url, code)   // throws on a bad URL/expired code — caller shows it
      get().setUser(user)
      await get().pullState()
      syncReminder(get().S)
      set({ needsMobileOnboarding: false })
    },
    // Leaves remote mode and drops cleanly back to local-only, without losing whatever was last
    // synced (signOut() already pushes before it clears).
    async disconnectServer() {
      await get().signOut()
      await forgetRemote()
      get().setGuest(true)
      set({ ready: true })
    },

    // "Sign out everywhere": the server bumps this profile's session version, which kills every
    // session it has on any device — this browser included, so the app has to end up exactly
    // where a normal signOut leaves it. Unlike signOut the request is NOT swallowed: if it fails
    // the sessions elsewhere are all still valid, and wiping this device's copy of the data
    // would sign the user out of the one place the bump didn't reach. Caller reports the error.
    async signOutAll() {
      await get().pushState()   // never throws — stores gym_dirty and moves on when offline
      await api('/api/logout/all', { method: 'POST', body: '{}' })
      clearLocalSession()
    },

    // Demo build only: drop the seeded example profile back in (Settings → "Reset demo data").
    // Dynamic import so the generator never ships in a self-hosted bundle.
    async resetDemo() {
      const { buildDemoState } = await import('../lib/demoSeed.js')
      localStorage.removeItem('gym_dirty')
      persist(Object.assign(clone(DEF), buildDemoState()), false)
    },

    // Boot: ask the server who we are, then pull.
    async boot() {
      // Mobile build: no backend by default — restore from the file mirror (the durable copy;
      // localStorage may have been evicted since the last run) and go straight in. Unless this
      // device was paired to a server ("connect to my server" mode, lib/remote.js), in which
      // case it behaves exactly like the signed-in web flow below, straight from here.
      if (MOBILE) {
        const remote = await loadRemote()
        if (remote?.mode === 'remote') {
          setRemoteAuth(remote.base, remote.token)
          try {
            const me = await api('/api/me')   // also catches a token revoked elsewhere (sign out everywhere)
            get().setUser(me.user)
            await get().pullState()
          } catch (e) {
            if (e.status === 401) { await forgetRemote(); get().setGuest(true) }
            else get().setUser(remote.user)   // offline — keep going from the last-synced local copy
          }
          syncReminder(get().S)
          set({ ready: true })
          return
        }
        const saved = await nativeLoad()
        const S = get().S
        if (saved && (!hasData(S) || (saved._ts || 0) >= (S._ts || 0))) {
          persist(Object.assign(clone(DEF), saved), false)
        } else if (hasData(S)) {
          nativeSave(S)   // first run after an update from a file-less version: seed the mirror
        }
        get().setGuest(true)
        syncReminder(get().S)
        // Only a genuinely first launch — nothing chosen yet and nothing to lose either — offers
        // the choice. Picking local (even with no data yet) persists that choice below and this
        // never asks again.
        set({ ready: true, needsMobileOnboarding: !remote && !hasData(get().S) })
        return
      }
      // Demo build (GitHub Pages): no backend at all — seed once, stay in guest mode.
      if (DEMO) {
        if (!localStorage.getItem(DEMO_SEEDED)) {
          localStorage.setItem(DEMO_SEEDED, '1')
          await get().resetDemo()
        }
        get().setGuest(true)
        set({ ready: true })
        return
      }
      // Guests never authenticate, so an instance that turned guest mode off has no request to
      // refuse — the only way the switch reaches someone already inside is here, on their next
      // boot. Ending the session needs a positive `allow_guest: false`; see lib/guest.js for why
      // an unreachable server must not be allowed to lock anyone out (#42).
      const cfg = await get().loadConfig()
      if (!guestAllowed(cfg)) get().setGuest(false)
      try {
        const me = await api('/api/me')
        get().setUser(me.user)
        await get().pullState()
        // Re-stamp the reminder's timezone on every load — keeps it correct if you're travelling,
        // without needing to revisit Settings.
        const tz = localTZ()
        if (get().S.reminder?.on && get().S.reminder.tz !== tz) {
          get().update(s => { s.reminder = { ...s.reminder, tz } })
        }
      } catch (e) {
        if (e.status === 401) get().setUser(null)
      }
      set({ ready: true })
    }
  }
})

export { hasData }