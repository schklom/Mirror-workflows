// Where the phone keeps the user's own API key: the platform's secure storage — the Keychain on
// iOS, the Keystore-backed EncryptedSharedPreferences on Android — and nowhere else. Never in
// S (which syncs and exports), never in localStorage (which the WebView evicts and any page on
// the same origin can read), never in the coach device file next to it.
//
// The plugin is imported lazily and every call is wrapped: on a plain web dev run it stores
// to localStorage by its own admission, and in a test there is no platform at all. In both
// cases the fallback is a process-local map that forgets on reload, which is the honest
// behaviour for a place that cannot keep a secret.
const KEY = 'coach.apiKey'
const memory = new Map()

let pluginPromise = null
function plugin() {
  if (!pluginPromise) {
    pluginPromise = import('@aparajita/capacitor-secure-storage')
      .then(m => (m && m.SecureStorage && typeof m.SecureStorage.get === 'function' ? m.SecureStorage : null))
      .catch(() => null)
  }
  return pluginPromise
}

export async function getApiKey() {
  const p = await plugin()
  if (p) {
    try { const v = await p.get(KEY); return typeof v === 'string' && v ? v : null } catch { /* fall through */ }
  }
  return memory.get(KEY) || null
}
export async function setApiKey(value) {
  const v = String(value || '').trim()
  if (!v) return clearApiKey()
  const p = await plugin()
  if (p) {
    try { await p.set(KEY, v); memory.delete(KEY); return } catch { /* fall through */ }
  }
  memory.set(KEY, v)
}
export async function clearApiKey() {
  const p = await plugin()
  if (p) { try { await p.remove(KEY) } catch { /* nothing to clear */ } }
  memory.delete(KEY)
}
