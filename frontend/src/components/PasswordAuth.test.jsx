// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { passwordError, PasswordSignInSheet, PasswordRegisterForm, PasswordRow, PasswordSheet } from './PasswordAuth.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

/* Password sign-in on screen (#118): the sign-in sheet and its reset-code half, creating a profile
   with a password, and the Settings row that sets, changes or removes one. The API is a
   stand-in; what each form sends, and what it says back in the UI language, is the point. */
const mocks = vi.hoisted(() => {
  const state = { webauthn: true, hasData: false, sheets: [], answers: {}, calls: [] }
  state.toast = vi.fn()
  state.setUser = vi.fn()
  state.adoptProfile = vi.fn(async () => ({}))
  state.pushState = vi.fn(async () => {})
  state.pullState = vi.fn(async () => {})
  state.passwordLogin = vi.fn()
  state.passwordRegister = vi.fn()
  state.passwordResetRedeem = vi.fn()
  state.passkeyAssertion = vi.fn(async () => ({ cid: 'c1', credential: { id: 'k1' } }))
  state.confirmSheet = vi.fn()
  state.api = vi.fn(async (path, init) => {
    state.calls.push({ path, method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null })
    const a = state.answers[(init?.method || 'GET') + ' ' + path]
    if (a instanceof Error) throw a
    return a ?? {}
  })
  state.snapshot = () => ({
    S: {}, config: { password_login: true },
    setUser: state.setUser, adoptProfile: state.adoptProfile, pushState: state.pushState, pullState: state.pullState,
  })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore, hasData: () => mocks.hasData }
})
vi.mock('../store/useUI.js', () => {
  const snap = () => ({ toast: (...a) => mocks.toast(...a), openSheet: (render, opts) => { mocks.sheets.push({ render, opts }); return {} } })
  const useUI = selector => selector ? selector(snap()) : snap()
  useUI.getState = snap
  return { useUI }
})
vi.mock('../lib/api.js', () => ({
  api: (...a) => mocks.api(...a),
  webauthnOK: () => mocks.webauthn,
  passkeyAssertion: (...a) => mocks.passkeyAssertion(...a),
  passwordLogin: (...a) => mocks.passwordLogin(...a),
  passwordRegister: (...a) => mocks.passwordRegister(...a),
  passwordResetRedeem: (...a) => mocks.passwordResetRedeem(...a),
}))
vi.mock('../sheets.jsx', () => ({ askAddDeviceData: vi.fn(), confirmSheet: (...a) => mocks.confirmSheet(...a) }))

const fail = (status, data) => Object.assign(new Error(data?.error || 'HTTP ' + status), { status, data })

const mounted = []
function mount(el) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  act(() => root.render(el))
  return host
}
const settle = () => act(() => new Promise(r => setTimeout(r, 0)))
function type(el, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const byPlaceholder = (host, p) => host.querySelector(`input[placeholder="${p}"]`)
const button = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent === text)
const submit = async host => { act(() => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) }); await settle() }
const alertText = host => host.querySelector('[role="alert"]')?.textContent || null

beforeEach(() => {
  mocks.webauthn = true
  mocks.hasData = false
  mocks.sheets.length = 0
  mocks.answers = {}
  mocks.calls.length = 0
  for (const f of [mocks.toast, mocks.setUser, mocks.adoptProfile, mocks.pushState, mocks.pullState, mocks.passwordLogin,
    mocks.passwordRegister, mocks.passwordResetRedeem, mocks.passkeyAssertion, mocks.confirmSheet]) f.mockClear()
})
afterEach(() => { act(() => { mounted.splice(0).forEach(({ root, host }) => { root.unmount(); host.remove() }) }) })

describe('passwordError', () => {
  it('words each server code in the UI language, and a pause with how long it lasts', () => {
    expect(passwordError(fail(401, { code: 'bad-credentials' }))).toBe('Wrong name or password.')
    expect(passwordError(fail(400, { code: 'too-common' }))).toMatch(/too easy to guess/)
    expect(passwordError(fail(400, { code: 'too-short' }))).toBe('Use at least 10 characters.')
    expect(passwordError(fail(409, { code: 'last-way-in' }))).toMatch(/only way into your profile/)
    expect(passwordError(fail(429, { code: 'locked', retryAfter: 120 }))).toBe('Too many attempts — try again in 2 minutes.')
    expect(passwordError(fail(429, { code: 'locked', retryAfter: 30 }))).toBe('Too many attempts — try again in 30 seconds.')
    // No code: what the server said, as it said it.
    expect(passwordError(fail(500, { error: 'server error' }))).toBe('server error')
  })
})

describe('PasswordSignInSheet', () => {
  it('signs in with the name and password, then carries on like a passkey sign-in', async () => {
    mocks.passwordLogin.mockResolvedValue({ id: 'u1', name: 'Ana' })
    const close = vi.fn()
    const host = mount(<PasswordSignInSheet close={close} />)
    const name = byPlaceholder(host, 'Your name')
    const pw = byPlaceholder(host, 'Password')
    // What password managers look for.
    expect(name.getAttribute('autocomplete')).toBe('username')
    expect(pw.getAttribute('autocomplete')).toBe('current-password')
    expect(pw.type).toBe('password')
    type(name, '  Ana '); type(pw, 'correct horse battery')
    await submit(host)
    expect(mocks.passwordLogin).toHaveBeenCalledWith('Ana', 'correct horse battery')
    expect(mocks.setUser).toHaveBeenCalledWith({ id: 'u1', name: 'Ana' })
    expect(close).toHaveBeenCalled()
    expect(mocks.adoptProfile).toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith('Welcome back, Ana')
  })

  it('a wrong password stays on the sheet and says so, without signing anyone in', async () => {
    mocks.passwordLogin.mockRejectedValue(fail(401, { error: 'wrong name or password', code: 'bad-credentials' }))
    const close = vi.fn()
    const host = mount(<PasswordSignInSheet close={close} />)
    type(byPlaceholder(host, 'Your name'), 'Ana'); type(byPlaceholder(host, 'Password'), 'nope nope nope')
    await submit(host)
    expect(alertText(host)).toBe('Wrong name or password.')
    expect(mocks.setUser).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })

  it('redeems a reset code with a new password; a too-short or mistyped one is caught before any request', async () => {
    mocks.passwordResetRedeem.mockResolvedValue({ id: 'u1', name: 'Ana' })
    const host = mount(<PasswordSignInSheet close={() => {}} />)
    act(() => button(host, 'Have a reset code from your admin?').click())
    expect(host.querySelector('h3').textContent).toBe('Reset your password')
    type(byPlaceholder(host, 'Your name'), 'Ana')
    type(byPlaceholder(host, 'Reset code'), 'k7wq-2mzp-4hxa')
    type(byPlaceholder(host, 'New password'), 'short')
    await submit(host)
    expect(alertText(host)).toBe('Use at least 10 characters.')
    expect(mocks.passwordResetRedeem).not.toHaveBeenCalled()
    // A typo would only show at the next sign-in, and cost another code from the admin.
    const again = byPlaceholder(host, 'Repeat the password')
    expect(again.getAttribute('autocomplete')).toBe('new-password')
    type(byPlaceholder(host, 'New password'), 'a brand new passphrase')
    type(again, 'a brand new passphrse')
    await submit(host)
    expect(alertText(host)).toBe('The two passwords are not the same.')
    expect(mocks.passwordResetRedeem).not.toHaveBeenCalled()
    type(again, 'a brand new passphrase')
    await submit(host)
    expect(mocks.passwordResetRedeem).toHaveBeenCalledWith('Ana', 'K7WQ-2MZP-4HXA', 'a brand new passphrase')
    expect(mocks.setUser).toHaveBeenCalled()
  })

  it('offers the passkey only when the caller hands one over and this browser can make one', () => {
    const onPasskey = vi.fn()
    const host = mount(<PasswordSignInSheet close={() => {}} onPasskey={onPasskey} />)
    act(() => button(host, 'Sign in with passkey').click())
    expect(onPasskey).toHaveBeenCalled()
    mocks.webauthn = false
    expect(button(mount(<PasswordSignInSheet close={() => {}} onPasskey={onPasskey} />), 'Sign in with passkey')).toBeUndefined()
    mocks.webauthn = true
    expect(button(mount(<PasswordSignInSheet close={() => {}} />), 'Sign in with passkey')).toBeUndefined()
  })
})

describe('PasswordRegisterForm', () => {
  function Harness({ inviteOnly }) {
    const [name, setName] = React.useState('')
    const [code, setCode] = React.useState('')
    return <PasswordRegisterForm close={() => {}} inviteOnly={inviteOnly} name={name} setName={setName} code={code} setCode={setCode} />
  }
  it('checks the invite and the repeated password here, then creates the profile', async () => {
    mocks.passwordRegister.mockResolvedValue({ id: 'u9', name: 'Cleo' })
    const host = mount(<Harness inviteOnly />)
    type(byPlaceholder(host, 'Your name'), 'Cleo')
    type(byPlaceholder(host, 'Password'), 'correct horse battery')
    type(byPlaceholder(host, 'Repeat the password'), 'correct horse battery')
    await submit(host)
    expect(alertText(host)).toBe('An invite code is required')
    type(byPlaceholder(host, 'Invite code'), 'abc123')
    type(byPlaceholder(host, 'Repeat the password'), 'correct horse batterY')
    await submit(host)
    expect(alertText(host)).toBe('The two passwords are not the same.')
    expect(mocks.passwordRegister).not.toHaveBeenCalled()
    type(byPlaceholder(host, 'Repeat the password'), 'correct horse battery')
    await submit(host)
    expect(mocks.passwordRegister).toHaveBeenCalledWith('Cleo', 'correct horse battery', 'ABC123')
    expect(mocks.setUser).toHaveBeenCalledWith({ id: 'u9', name: 'Cleo' })
    expect(mocks.pullState).toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith('Welcome, Cleo')
  })

  it('a name already taken by a password profile is said in words', async () => {
    mocks.passwordRegister.mockRejectedValue(fail(409, { code: 'name-taken' }))
    const host = mount(<Harness />)
    type(byPlaceholder(host, 'Your name'), 'Ana')
    type(byPlaceholder(host, 'Password'), 'correct horse battery')
    type(byPlaceholder(host, 'Repeat the password'), 'correct horse battery')
    await submit(host)
    expect(alertText(host)).toBe('Another profile already signs in with this name.')
  })
})

describe('Settings → Password', () => {
  const rowTitle = host => host.querySelector('.lrow-t')?.textContent
  const rowSub = host => host.querySelector('.lrow-s')?.textContent

  it('shows whether a password is set, and nothing when a first one could not be confirmed here', async () => {
    mocks.answers['GET /api/account/password'] = { set: true, setAt: null, passkeys: 1, name: 'Ana', nameTaken: false }
    const host = mount(<PasswordRow />)
    await settle()
    expect(rowTitle(host)).toBe('Password')
    expect(rowSub(host)).toBe('Set · sign in as “Ana”')

    mocks.answers['GET /api/account/password'] = { set: false, setAt: null, passkeys: 1, name: 'Ana', nameTaken: false }
    mocks.webauthn = false
    const none = mount(<PasswordRow />)
    await settle()
    expect(none.textContent).toBe('')
  })

  it('a first password is confirmed with the passkey and sent with its assertion', async () => {
    const done = vi.fn(), close = vi.fn()
    const host = mount(<PasswordSheet status={{ set: false, passkeys: 1, name: 'Ana' }} close={close} done={done} />)
    expect(byPlaceholder(host, 'Current password')).toBeNull()
    type(byPlaceholder(host, 'New password'), 'correct horse battery')
    type(byPlaceholder(host, 'Repeat the password'), 'correct horse battery')
    await submit(host)
    expect(mocks.passkeyAssertion).toHaveBeenCalled()
    expect(mocks.calls.at(-1)).toEqual({ path: '/api/account/password', method: 'POST', body: { next: 'correct horse battery', cid: 'c1', credential: { id: 'k1' } } })
    expect(close).toHaveBeenCalled()
    expect(done).toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith('Password saved — you are signed out everywhere else.')
  })

  it('a change sends the current password; a wrong one is said on the sheet', async () => {
    mocks.answers['POST /api/account/password'] = fail(403, { code: 'current-wrong' })
    const close = vi.fn()
    const host = mount(<PasswordSheet status={{ set: true, passkeys: 0, name: 'Ana' }} close={close} done={() => {}} />)
    type(byPlaceholder(host, 'Current password'), 'old passphrase here')
    type(byPlaceholder(host, 'New password'), 'a brand new passphrase')
    type(byPlaceholder(host, 'Repeat the password'), 'a brand new passphrase')
    await submit(host)
    expect(mocks.calls.at(-1).body).toEqual({ next: 'a brand new passphrase', current: 'old passphrase here' })
    expect(mocks.passkeyAssertion).not.toHaveBeenCalled()
    expect(alertText(host)).toBe('Your current password is not right.')
    expect(close).not.toHaveBeenCalled()
    // No passkey on this profile: the password is its only way in, so there is no "Remove" —
    // and no "confirm with your passkey" either.
    expect(button(host, 'Remove password')).toBeUndefined()
    expect(button(host, 'Forgot it? Confirm with your passkey instead')).toBeUndefined()
  })

  it('removing asks first and then deletes; only offered while a passkey remains', async () => {
    const done = vi.fn()
    const host = mount(<PasswordSheet status={{ set: true, passkeys: 2, name: 'Ana' }} close={() => {}} done={done} />)
    act(() => button(host, 'Remove password').click())
    expect(mocks.confirmSheet).toHaveBeenCalledTimes(1)
    const opts = mocks.confirmSheet.mock.calls[0][0]
    expect(opts.title).toBe('Remove your password?')
    await act(async () => { opts.onConfirm() })
    await settle()
    expect(mocks.calls.at(-1)).toEqual({ path: '/api/account/password', method: 'DELETE', body: null })
    expect(done).toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith('Password removed')
  })
})
