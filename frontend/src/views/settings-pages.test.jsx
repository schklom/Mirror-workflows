// @vitest-environment happy-dom
// Settings v1.3.11: the root, the pages, the search and the rest wheels. Every row the search
// knows has to be a row on its page, and every page and row title has a word in each pack.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAGES, PAGE_IDS, ROOT_GROUPS, SEARCH, pageVisible, searchSettings, pageTrail, fold } from './settings-pages.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null, user: null, MOBILE: false, sheets: [], navs: [] }
  state.snapshot = () => ({
    S: state.S, user: state.user, coachLocal: null, sync: null, config: null,
    update: mut => { const next = structuredClone(state.S); mut(next); state.S = next },
    replaceState: vi.fn(), setUser: vi.fn(), pullState: vi.fn(), pushState: vi.fn(), setUnit: vi.fn(),
    resetEverything: vi.fn(), resetDemo: vi.fn(), importBackup: vi.fn(), importConflict: vi.fn(),
  })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore, DEF: { reminder: { time: '17:30' } }, hasData: () => false }
})
vi.mock('../store/useUI.js', () => {
  const snap = () => ({ toast: vi.fn(), openSheet: render => { mocks.sheets.push(render); return { close: vi.fn() } } })
  const useUI = selector => selector ? selector(snap()) : snap()
  useUI.getState = snap
  return { useUI }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => (...a) => mocks.navs.push(a) }))
vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), webauthnOK: () => false, passkeyLogin: vi.fn(), passkeyRegister: vi.fn(), IS_ANDROID: false }))
vi.mock('../lib/push.js', () => ({ pushSupported: () => false, enablePush: vi.fn(), disablePush: vi.fn(), sendTestPush: vi.fn(), syncPushSubscription: vi.fn() }))
vi.mock('../lib/wakelock.js', () => ({ wakeLockSupported: () => true }))
vi.mock('../lib/mobile.js', () => ({ get MOBILE() { return mocks.MOBILE }, isAndroid: () => Promise.resolve(false), shareExport: vi.fn(), shareExportBlob: vi.fn(), syncReminder: vi.fn() }))
vi.mock('./MobileOnboarding.jsx', () => ({ ConnectSheet: () => null }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), confirmSheet: vi.fn(), importFromApp: vi.fn(), importFromHevy: vi.fn(),
  equipmentProfileSheet: vi.fn(), plateInventorySheet: vi.fn(), menuSheet: vi.fn(),
}))

import Settings from './Settings.jsx'

globalThis.__APP_VERSION__ ??= 'test'

let host, root
beforeEach(() => {
  mocks.S = {
    unit: 'kg', restSec: 90, restPauseSec: 15, sound: true, vibrate: true, effort: 'none', gifSize: 'full', lang: 'en',
    workouts: [], routines: [], exWeights: {}, equipProfiles: [{ id: 'p1', name: 'Home', equipment: [] }], activeEquipId: 'p1',
    reminder: { on: false, time: '17:30' },
  }
  mocks.user = null
  mocks.MOBILE = false
  mocks.sheets = []
  mocks.navs = []
  Object.defineProperty(navigator, 'vibrate', { value: () => true, configurable: true, writable: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  delete navigator.vibrate
})

const mount = (page = null, find = null) => act(() => root.render(<Settings page={page} find={find} />))
const rowTitled = title => [...host.querySelectorAll('.lrow')].find(r => r.querySelector('.lrow-t')?.textContent === title)
const titles = () => [...host.querySelectorAll('.lrow .lrow-t')].map(e => e.textContent)

// This test's guest in a browser, as the page itself sees it.
const guestWeb = {
  user: null, mobile: false, android: false, demo: false, wakeOK: true, hasMedia: false, pwOn: false, webauthn: false,
  sound: true, playOnSilent: false, canVibrate: true, vibrate: true, profiles: true, nameLang: false,
}

describe('the root', () => {
  it('is an account card and one row per page, in the four groups, with value previews', () => {
    mount()
    expect(host.querySelector('.sp-acct .lrow-t').textContent).toBe('Guest')
    expect(host.querySelector('.sp-acct .lrow-s').textContent).toBe('Your data lives on this device. Sign in to sync.')
    // a guest in a browser has no reminders (no push server) and no Coach page (the server's Coach)
    expect(titles()).toEqual(['Guest', 'Workout', 'Timer alerts', 'Plan & schedule', 'Units & language', 'Equipment', 'Look & Home', 'Data & backup', 'About & updates'])
    expect(rowTitled('Workout').querySelector('.lrow-v').textContent).toBe('1:30 rest · Cards')
    expect(rowTitled('Timer alerts').querySelector('.lrow-v').textContent).toBe('Sound · Vibrate')
    expect(rowTitled('Plan & schedule').querySelector('.lrow-v').textContent).toMatch(/^Fixed Week · Mon/)
    expect(rowTitled('Units & language').querySelector('.lrow-v').textContent).toBe('kg · English')
    expect(rowTitled('Equipment').querySelector('.lrow-v').textContent).toBe('Everything')
    expect(rowTitled('About & updates').querySelector('.lrow-v').textContent).toMatch(/^v\d|^vtest/)
  })

  it('previews a rest that was never on the old list, and no timer at all', () => {
    mocks.S.restSec = 105
    mount()
    expect(rowTitled('Workout').querySelector('.lrow-v').textContent).toBe('1:45 rest · Cards')
    mocks.S.restSec = 0
    mount()
    expect(rowTitled('Workout').querySelector('.lrow-v').textContent).toBe('No rest timer · Cards')
  })

  it('signed in, Reminders is there and the card names the account; on the phone app the Coach too', () => {
    mocks.user = { id: 'u1', name: 'Dana' }
    mount()
    expect(titles()).toContain('Reminders')
    expect(titles()).not.toContain('AI Coach')
    expect(host.querySelector('.sp-acct .lrow-t').textContent).toBe('Dana')
    expect(host.querySelector('.sp-avatar').textContent).toBe('D')
    mocks.user = null
    mocks.MOBILE = true
    mount()
    expect(titles()).toContain('Reminders')
    expect(titles()).toContain('AI Coach')
    expect(host.querySelector('.sp-acct .lrow-t').textContent).toBe('This phone')
  })

  it('a row opens its page; the Coach row opens the phone Coach setup; the card opens Account', () => {
    mocks.MOBILE = true
    mount()
    act(() => rowTitled('Timer alerts').click())
    act(() => rowTitled('AI Coach').click())
    act(() => host.querySelector('.sp-acct').click())
    expect(mocks.navs).toEqual([['/settings/alerts'], ['/coach/setup'], ['/settings/account']])
  })

  it('searches every setting and a hit goes to its page with the row to flash', () => {
    mount()
    const input = host.querySelector('.sp-search input')
    const type = v => act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      set.call(input, v)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    type('haptic')
    expect(titles()).toEqual(['Vibrate'])
    expect(host.querySelector('.lrow .lrow-s').textContent).toBe('Timer alerts')
    act(() => rowTitled('Vibrate').click())
    expect(mocks.navs.at(-1)).toEqual(['/settings/alerts', { state: { find: 'Vibrate' } }])
    type('zzzz')
    expect(host.querySelector('.sp-empty').textContent).toBe('No setting matches “zzzz”.')
  })
})

describe('the pages', () => {
  it('each search entry is a row on its page (guest in a browser)', () => {
    const byPage = {}
    for (const e of SEARCH) if (pageVisible(PAGES[e.page].parent || e.page, guestWeb) && (!e.when || e.when(guestWeb))) (byPage[e.page] ||= []).push(e.title)
    expect(Object.keys(byPage).sort()).toEqual(['about', 'advanced', 'alerts', 'data', 'equipment', 'look', 'plan', 'units', 'workout'])
    for (const [page, want] of Object.entries(byPage)) {
      mount(page)
      const have = titles()
      for (const title of want) expect(have, `${page}: ${title}`).toContain(title)
    }
  })

  it('every old row has a home: the Workout page holds the rest, logging and the before/during rows', () => {
    mount('workout')
    expect([...host.querySelectorAll('.sect-t')].map(e => e.textContent)).toEqual(['Rest', 'Logging', 'Before and during'])
    expect(titles()).toEqual(['Rest timer', 'Rest-pause rest', 'Effort per set', 'Shown under each exercise', 'Layout',
      'Weigh in before workouts', 'Keep screen awake', 'Exercise animations', 'Fine-tuning'])
    mount('advanced')
    expect(titles()).toEqual(['Planned sessions start from', 'Keep timing after target', 'Weight and reps buttons',
      'Drop and burst shortcuts on every set', 'Superset buttons in the exercise header', 'Move, swap and remove buttons below the exercise'])
  })

  it('the Fine-tuning switches write S.wc as the old Workout controls sheet did', () => {
    mount('advanced')
    act(() => rowTitled('Superset buttons in the exercise header').querySelector('[role="switch"]').click())
    expect(mocks.S.wc.pairButtons).toBe(true)
  })

  it('a sub-page names where back goes; Fine-tuning goes back to Workout', () => {
    mount('alerts')
    expect(host.querySelector('.sp-back').textContent).toBe('Settings')
    expect(host.querySelector('.sp-title').textContent).toBe('Timer alerts')
    mount('advanced')
    expect(host.querySelector('.sp-back').textContent).toBe('Workout')
    act(() => host.querySelector('.sp-back').click())
    expect(mocks.navs.at(-1)).toEqual(['/settings/workout', { replace: true }])
  })

  it('a search hit flashes its row', () => {
    mount('alerts', 'Flash the screen')
    expect(rowTitled('Flash the screen').classList.contains('sp-flash')).toBe(true)
  })
})

describe('the rest wheels', () => {
  const doneIn = sheet => {
    const close = vi.fn()
    const h = document.createElement('div'); document.body.appendChild(h)
    const r = createRoot(h)
    act(() => r.render(sheet(close)))
    return { h, r, close }
  }
  it('Rest timer opens the wheel and stores any value as seconds in restSec', () => {
    mount('workout')
    expect(rowTitled('Rest timer').querySelector('.lrow-v').textContent).toBe('1:30')
    act(() => rowTitled('Rest timer').click())
    const { h, r } = doneIn(mocks.sheets.at(-1))
    expect(h.querySelector('h3').textContent).toBe('Rest timer')
    const [min, sec] = h.querySelectorAll('[role="spinbutton"]')
    expect(min.getAttribute('aria-valuemax')).toBe('15')
    act(() => { sec.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true })) })
    act(() => { sec.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })) })
    act(() => { [...h.querySelectorAll('button')].find(b => b.textContent === 'Done').click() })
    expect(mocks.S.restSec).toBe(101)
    act(() => r.unmount()); h.remove()
    mount('workout')
    expect(rowTitled('Rest timer').querySelector('.lrow-v').textContent).toBe('1:41')
  })

  it('0:00 is the timer off', () => {
    mocks.S.restSec = 0
    mount('workout')
    expect(rowTitled('Rest timer').querySelector('.lrow-v').textContent).toBe('Off')
  })

  it('Rest-pause rest uses the wheel too, 5 s to 5 minutes', () => {
    mount('workout')
    act(() => rowTitled('Rest-pause rest').click())
    const { h, r } = doneIn(mocks.sheets.at(-1))
    const [min, sec] = h.querySelectorAll('[role="spinbutton"]')
    expect(min.getAttribute('aria-valuemax')).toBe('5')
    act(() => { sec.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })) })
    act(() => { [...h.querySelectorAll('button')].find(b => b.textContent === 'Done').click() })
    expect(mocks.S.restPauseSec).toBe(5)
    act(() => r.unmount()); h.remove()
  })
})

describe('searchSettings', () => {
  const tr = s => s
  it('matches titles, synonyms and pages, ignoring case and accents', () => {
    expect(searchSettings('Vibrate', guestWeb, tr).map(h => h.title)).toEqual(['Vibrate'])
    expect(searchSettings('buzz', guestWeb, tr).map(h => h.title)).toEqual(['Vibrate'])
    expect(searchSettings('pounds', guestWeb, tr).map(h => h.title)).toEqual(['Weight unit'])
    expect(searchSettings('dark mode', guestWeb, tr).map(h => h.title)).toEqual(['Theme'])
    expect(searchSettings('gif', guestWeb, tr).map(h => h.title)).toEqual(['Exercise animations'])
    expect(searchSettings('RÉST TIMER', guestWeb, tr)[0].title).toBe('Rest timer')
    expect(fold('Thème')).toBe('theme')
  })

  it('pages are hits too, and a title starting with the query comes first', () => {
    const hits = searchSettings('units', guestWeb, tr)
    expect(hits[0]).toMatchObject({ title: 'Units & language', isPage: true, page: 'units' })
    expect(searchSettings('rest', guestWeb, tr).slice(0, 2).map(h => h.title)).toEqual(['Rest timer', 'Rest-pause rest'])
  })

  it('names Fine-tuning under Workout, and keeps to the rows this device shows', () => {
    expect(pageTrail('advanced', tr)).toBe('Workout › Fine-tuning')
    expect(searchSettings('overtime', guestWeb, tr)[0].trail).toBe('Workout › Fine-tuning')
    expect(searchSettings('nudge', guestWeb, tr)).toEqual([])                              // no Reminders for a web guest
    expect(searchSettings('nudge', { ...guestWeb, user: { id: 'u' } }, tr).map(h => h.title)).toEqual(['Nudge me when I skip a planned workout'])
    expect(searchSettings('coach', guestWeb, tr)).toEqual([])
    expect(searchSettings('coach', { ...guestWeb, mobile: true }, tr)[0].page).toBe('coach')
    expect(searchSettings('vibrate silent', { ...guestWeb, mobile: true, android: true }, tr).map(h => h.title)).toEqual(['Vibrate on silent too'])
    expect(searchSettings('   ', guestWeb, tr)).toEqual([])
  })

  it('searches in the app language as well', () => {
    const de = { Vibrate: 'Vibration', 'Timer alerts': 'Timer-Hinweise', Settings: 'Einstellungen' }
    const hits = searchSettings('vibration', guestWeb, s => de[s] || s)
    expect(hits[0]).toMatchObject({ title: 'Vibrate', label: 'Vibration', trail: 'Timer-Hinweise' })
  })
})

describe('translations', () => {
  const packs = import.meta.glob('../locales/*.js', { eager: true, import: 'default' })
  it('every page and searchable row title has a word in each pack', () => {
    const keys = [...new Set([...PAGE_IDS.map(id => PAGES[id].title), ...SEARCH.map(e => e.title)])]
    for (const [file, pack] of Object.entries(packs)) {
      const missing = keys.filter(k => !Object.hasOwn(pack, k) || !String(pack[k]).trim())
      expect(missing, file).toEqual([])
    }
  })
  it('the root groups only name real pages', () => {
    for (const g of ROOT_GROUPS) for (const id of g) expect(PAGES[id], id).toBeTruthy()
  })
})
