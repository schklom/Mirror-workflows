// Name-and-password sign-in next to passkeys (#118), on an instance that offers it
// (GET /api/config → `password_login`). Everything a password needs on screen lives here:
// signing in, redeeming the one-time code an admin hands out, creating a profile with a
// password, and the Settings row that sets, changes or removes one. Passkeys stay the default
// wherever this appears; the rules themselves are the server's (api/password.js and the
// password block in api/server.js), this only words them.
import { useEffect, useRef, useState } from 'react'
import { useStore, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { dateLocale } from '../lib/i18n-core.js'
import { api, webauthnOK, passkeyAssertion, passwordLogin, passwordRegister, passwordResetRedeem } from '../lib/api.js'
import { askAddDeviceData, confirmSheet } from '../sheets.jsx'
import { Row, Button } from './ui.jsx'

// The server's floor (api/password.js MIN_LENGTH), checked here first so the common mistake is
// answered without a round trip. The server still decides.
export const MIN_PASSWORD = 10
export const passwordOn = config => !!config?.password_login

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const length = s => [...String(s || '')].length
const errStyle = { color: 'var(--red)', marginTop: 10 }

// "in 5 minutes" in the UI language, for how long a pause (429, Retry-After) still lasts.
function fmtIn(sec) {
  const [n, unit] = sec < 60 ? [Math.max(1, Math.round(sec)), 'second'] : sec < 3600 ? [Math.ceil(sec / 60), 'minute'] : [Math.ceil(sec / 3600), 'hour']
  try { return new Intl.RelativeTimeFormat(dateLocale(), { numeric: 'always' }).format(n, unit) }
  catch { return n + ' ' + unit }
}

// The server's answer in the UI language. Every password route sends a stable `code` beside its
// English message (api/openapi.yaml, Error.code); an answer without one is shown as it came.
export function passwordError(e) {
  const code = e?.data?.code
  if (e?.status === 429 || code === 'locked') return t('Too many attempts — try again {0}.', fmtIn(e?.data?.retryAfter || 60))
  switch (code) {
    case 'bad-credentials': return t('Wrong name or password.')
    case 'too-short': return t('Use at least {0} characters.', MIN_PASSWORD)
    case 'too-long': return t('That password is too long.')
    case 'too-common': return t('That password is too easy to guess — try a longer one, or a few unrelated words.')
    case 'name-taken': return t('Another profile already signs in with this name.')
    case 'invite': return t('That invite code is not valid.')
    case 'current-required': case 'current-wrong': return t('Your current password is not right.')
    case 'passkey': case 'passkey-required': return t('Your passkey could not be confirmed.')
    case 'last-way-in': return t('This password is the only way into your profile, so it cannot be removed.')
    case 'reset-invalid': return t('That reset code is wrong or has expired — ask your admin for a new one.')
    case 'disabled': return t('This account has been disabled.')
    case 'busy': return t('The server is busy — try again in a moment.')
  }
  return e?.message || t('Sign-in failed')
}
// A passkey prompt the person closed is their answer, not an error worth a line in red.
const dismissed = e => e?.name === 'NotAllowedError' || e?.name === 'AbortError'

// Signed in: the same steps as a passkey sign-in (Login.jsx) — and the same account coming back
// merges what this device kept for it (adoptProfile).
async function signedIn(u, close) {
  const st = useStore.getState()
  st.setUser(u)
  close()
  await st.adoptProfile(askAddDeviceData)
  toast(t('Welcome back, {0}', u.name))
}

const field = { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }
const codeStyle = { letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }

/* Sign in with name and password, or — one tap away — redeem a reset code from the admin, which
   sets a new password and signs in. `onPasskey`, when given, offers the passkey instead. The
   inputs carry the autocomplete names password managers look for, inside a real form. */
export function PasswordSignInSheet({ close, onPasskey }) {
  const [mode, setMode] = useState('signin')   // 'signin' | 'reset'
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [code, setCode] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const nameRef = useRef(null)
  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 250) }, [])
  const reset = mode === 'reset'
  const submit = async ev => {
    ev.preventDefault()
    if (busy) return
    const n = name.trim()
    const bad = !n ? t('Enter a name')
      : !reset && !pw ? t('Enter your password.')
      : reset && !code.trim() ? t('Enter the reset code.')
      : reset && length(next) < MIN_PASSWORD ? t('Use at least {0} characters.', MIN_PASSWORD)
      // A typo here is only found at the next sign-in, and fixing it takes another code.
      : reset && next !== again ? t('The two passwords are not the same.')
      : null
    if (bad) { setErr(bad); return }
    setBusy(true); setErr(null)
    try { await signedIn(reset ? await passwordResetRedeem(n, code.trim(), next) : await passwordLogin(n, pw), close) }
    catch (e) { setErr(passwordError(e)) }
    finally { setBusy(false) }
  }
  return <>
    <h3>{reset ? t('Reset your password') : t('Sign in with password')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{reset
      ? t('Enter the code your admin gave you and choose a new password. It signs you out everywhere else.')
      : t('Use your profile name and the password you set for it.')}</div>
    <form onSubmit={submit} noValidate>
      <input ref={nameRef} className="input" name="username" autoComplete="username" placeholder={t('Your name')} maxLength={40}
        value={name} onChange={e => setName(e.target.value)} {...field} />
      <div style={{ height: 10 }} />
      {reset ? <>
        <input className="input" name="reset-code" autoComplete="one-time-code" placeholder={t('Reset code')} maxLength={20}
          value={code} onChange={e => setCode(e.target.value.toUpperCase())} {...field} style={codeStyle} />
        <div style={{ height: 10 }} />
        <input className="input" type="password" name="new-password" autoComplete="new-password" placeholder={t('New password')}
          value={next} onChange={e => setNext(e.target.value)} />
        <div style={{ height: 10 }} />
        <input className="input" type="password" name="new-password-again" autoComplete="new-password" placeholder={t('Repeat the password')}
          value={again} onChange={e => setAgain(e.target.value)} />
        <div className="dim small" style={{ marginTop: 6 }}>{t('At least {0} characters. A few unrelated words make a good one.', MIN_PASSWORD)}</div>
      </> : <input className="input" type="password" name="password" autoComplete="current-password" placeholder={t('Password')}
        value={pw} onChange={e => setPw(e.target.value)} />}
      {err && <div className="small" role="alert" style={errStyle}>{err}</div>}
      <div style={{ height: 12 }} />
      <Button type="submit" variant="primary" disabled={busy}>{reset ? t('Set password & sign in') : t('Sign in')}</Button>
    </form>
    <div style={{ height: 8 }} />
    <Button type="button" variant="ghost" className="dim" onClick={() => { setErr(null); setMode(reset ? 'signin' : 'reset') }}>
      {reset ? t('Sign in with password') : t('Have a reset code from your admin?')}</Button>
    {onPasskey && !reset && webauthnOK() && <>
      <div style={{ height: 8 }} />
      <Button type="button" icon="person" onClick={() => { close(); onPasskey() }}>{t('Sign in with passkey')}</Button>
    </>}
  </>
}
export const openPasswordSignIn = onPasskey => ui().openSheet(close => <PasswordSignInSheet close={close} onPasskey={onPasskey} />)

/* The password half of creating a profile. Name and invite code are the caller's state, so
   switching between passkey and password on the sign-up sheet keeps what was typed. */
export function PasswordRegisterForm({ close, inviteOnly, name, setName, code, setCode }) {
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const submit = async ev => {
    ev.preventDefault()
    if (busy) return
    const n = name.trim()
    const bad = !n ? t('Enter a name')
      : inviteOnly && !code.trim() ? t('An invite code is required')
      : length(pw) < MIN_PASSWORD ? t('Use at least {0} characters.', MIN_PASSWORD)
      : pw !== again ? t('The two passwords are not the same.')
      : null
    if (bad) { setErr(bad); return }
    setBusy(true); setErr(null)
    try {
      const u = await passwordRegister(n, pw, code.trim())
      const st = useStore.getState()
      st.setUser(u); close()
      if (hasData(useStore.getState().S)) { await st.pushState(); toast(t('Profile created — data from this device moved into it')) }
      else { await st.pullState(); toast(t('Welcome, {0}', u.name)) }
    } catch (e) { setErr(passwordError(e)) }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} noValidate>
    <input className="input" name="username" autoComplete="username" placeholder={t('Your name')} maxLength={40}
      value={name} onChange={e => setName(e.target.value)} {...field} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={codeStyle} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    </>}
    <div style={{ height: 10 }} />
    <input className="input" type="password" name="new-password" autoComplete="new-password" placeholder={t('Password')}
      value={pw} onChange={e => setPw(e.target.value)} />
    <div style={{ height: 10 }} />
    <input className="input" type="password" name="new-password-again" autoComplete="new-password" placeholder={t('Repeat the password')}
      value={again} onChange={e => setAgain(e.target.value)} />
    <div className="dim small" style={{ marginTop: 6 }}>{t('At least {0} characters. A few unrelated words make a good one.', MIN_PASSWORD)}</div>
    {err && <div className="small" role="alert" style={errStyle}>{err}</div>}
    <div style={{ height: 12 }} />
    <Button type="submit" variant="primary" disabled={busy}>{t('Create profile')}</Button>
  </form>
}

// The same form on its own sheet — Settings, in a browser that cannot make a passkey.
function PasswordRegisterSheet({ close }) {
  const config = useStore(s => s.config)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name and a password. You sign in with both.')}</div>
    <PasswordRegisterForm close={close} inviteOnly={!!config?.invite_only} name={name} setName={setName} code={code} setCode={setCode} />
  </>
}
export const openPasswordRegister = () => ui().openSheet(close => <PasswordRegisterSheet close={close} />)

/* Settings' account rows read the server as the screen opens. One that found the server down
   has nothing to show, and stayed missing until Settings was left and opened again, while the
   block above it already said "All synced". It asks again whenever the store hears from the
   server — a push or pull that landed, a check that found both sides in step — until it gets
   an answer. A refusal (a server from before the route, a 403) is an answer: asking again
   would only get the same one. */
export const notReached = e => e?.status == null || e.status >= 500
export function useAgainOnceReached(unreached, load) {
  const reachedAt = useStore(s => s.sync?.lastSynced)
  useEffect(() => { if (unreached) load() }, [reachedAt])
}

/* ------------------------------------------------------------------- Settings -------------
   Settings → Account → Password, for a signed-in browser. A first password needs a passkey
   ceremony right now (a session on its own could be a copied cookie); a change needs the
   current password, or the passkey when it was forgotten. Saving signs every other device out,
   which the sheet says before anyone taps. */
// `version` changes when the profile's passkeys do (Settings, components/Passkeys.jsx): whether the
// password may be removed depends on them, so the row asks again.
export function PasswordRow({ version = 0 }) {
  const [st, setSt] = useState(null)   // GET /api/account/password
  const [unreached, setUnreached] = useState(false)
  const load = () => api('/api/account/password').then(r => { setSt(r); setUnreached(false) }).catch(e => setUnreached(notReached(e)))
  useEffect(() => { load() }, [version])
  useAgainOnceReached(unreached, load)
  if (!st) return null
  // Nothing here could set a first password without a passkey ceremony.
  if (!st.set && (!webauthnOK() || !st.passkeys)) return null
  const blocked = !st.set && st.nameTaken
  const subtitle = blocked ? t('Another profile already signs in with this name.')
    : st.set ? t('Set · sign in as “{0}”', st.name)
    : t('Not set — lets you sign in where passkeys do not work.')
  return <Row icon="key" iconTint="var(--orange)" title={t('Password')} subtitle={subtitle} accessory={blocked ? 'none' : 'chevron'}
    onClick={blocked ? undefined : () => ui().openSheet(close => <PasswordSheet status={st} close={close} done={load} />)} />
}

export function PasswordSheet({ status, close, done }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const save = async withPasskey => {
    if (busy) return
    const bad = !withPasskey && !current ? t('Enter your password.')
      : length(next) < MIN_PASSWORD ? t('Use at least {0} characters.', MIN_PASSWORD)
      : next !== again ? t('The two passwords are not the same.')
      : null
    if (bad) { setErr(bad); return }
    setBusy(true); setErr(null)
    try {
      const proof = withPasskey ? await passkeyAssertion() : { current }
      await api('/api/account/password', { method: 'POST', body: JSON.stringify({ next, ...proof }) })
      close(); done()
      toast(t('Password saved — you are signed out everywhere else.'))
    } catch (e) { if (!dismissed(e)) setErr(passwordError(e)) }
    finally { setBusy(false) }
  }
  const remove = () => confirmSheet({
    title: t('Remove your password?'),
    message: t('Only your passkeys sign in to this profile afterwards.'),
    confirmText: t('Remove'), danger: true,
    onConfirm: () => api('/api/account/password', { method: 'DELETE' })
      .then(() => { close(); done(); toast(t('Password removed')) })
      .catch(e => toast(passwordError(e))),
  })
  return <>
    <h3>{status.set ? t('Change password') : t('Set a password')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>
      {t('Sign in as “{0}” with it on devices where passkeys do not work. Saving signs you out everywhere else, and paired phones have to be paired again.', status.name)}
    </div>
    <form onSubmit={ev => { ev.preventDefault(); save(!status.set) }} noValidate>
      {/* Tells a password manager which account the new password belongs to. */}
      <input type="text" name="username" autoComplete="username" value={status.name} readOnly hidden />
      {status.set && <>
        <input className="input" type="password" name="current-password" autoComplete="current-password" placeholder={t('Current password')}
          value={current} onChange={e => setCurrent(e.target.value)} />
        <div style={{ height: 10 }} />
      </>}
      <input className="input" type="password" name="new-password" autoComplete="new-password" placeholder={t('New password')}
        value={next} onChange={e => setNext(e.target.value)} />
      <div style={{ height: 10 }} />
      <input className="input" type="password" name="new-password-again" autoComplete="new-password" placeholder={t('Repeat the password')}
        value={again} onChange={e => setAgain(e.target.value)} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('At least {0} characters. A few unrelated words make a good one.', MIN_PASSWORD)}</div>
      {err && <div className="small" role="alert" style={errStyle}>{err}</div>}
      <div style={{ height: 12 }} />
      <Button type="submit" variant="primary" disabled={busy}>{status.set ? t('Save') : t('Confirm with passkey & save')}</Button>
    </form>
    {status.set && status.passkeys > 0 && webauthnOK() && <>
      <div style={{ height: 8 }} />
      <Button type="button" variant="ghost" className="dim" disabled={busy} onClick={() => save(true)}>{t('Forgot it? Confirm with your passkey instead')}</Button>
    </>}
    {status.set && status.passkeys > 0 && <>
      <div style={{ height: 8 }} />
      <button type="button" className="btn danger" disabled={busy} onClick={remove}>{t('Remove password')}</button>
    </>}
  </>
}
