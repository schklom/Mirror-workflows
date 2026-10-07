// Mobile build only: a self-hosted server behind Cloudflare Access (Zero Trust). Access stops
// every request at Cloudflare's edge until it proves who it is, and a phone cannot do the
// browser's interactive sign-in from inside the app's WebView. A service token can: two headers,
// CF-Access-Client-Id and CF-Access-Client-Secret, on every request to the server — the pairing
// itself included, which is why they are entered before it (MobileOnboarding.jsx).
//
// Both live in the platform's secure storage (lib/coach-secrets.js), never in S or the pairing
// file, and are handed to lib/api.js, which adds them to the requests that go to the paired
// server and to nothing else.
import { secureGet, secureSet, secureRemove } from './coach-secrets.js'
import { setAccessHeaders } from './api.js'

const KEY = 'cfAccess'

const clean = v => String(v || '').trim()

// The headers for a pair of values, or {} when either is missing: Access refuses a token with
// only half of it, and an empty header would be sent as one.
export function accessHeaders(creds) {
  const id = clean(creds && creds.clientId)
  const secret = clean(creds && creds.clientSecret)
  if (!id || !secret) return {}
  return { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret }
}

export async function loadCfAccess() {
  let creds = null
  try {
    const raw = await secureGet(KEY)
    const v = raw ? JSON.parse(raw) : null
    if (v && typeof v === 'object') creds = { clientId: clean(v.clientId), clientSecret: clean(v.clientSecret) }
  } catch { /* unreadable: as if never set */ }
  setAccessHeaders(accessHeaders(creds))
  return creds && creds.clientId && creds.clientSecret ? creds : null
}

// Empty values clear the token; anything half-filled is refused by the caller (CfAccessSheet).
export async function saveCfAccess({ clientId, clientSecret } = {}) {
  const creds = { clientId: clean(clientId), clientSecret: clean(clientSecret) }
  if (!creds.clientId || !creds.clientSecret) {
    await secureRemove(KEY)
    setAccessHeaders({})
    return null
  }
  await secureSet(KEY, JSON.stringify(creds))
  setAccessHeaders(accessHeaders(creds))
  return creds
}
