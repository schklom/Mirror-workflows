// State accessor — opens ./data/state-<uid>.json (+ db.json for the user record), caches it,
// and re-reads via fs.watch so tools reflect a session the web UI just finished without a
// server restart. Read-only by design: nothing in the MCP server ever writes to these files,
// which keeps it consistent with the api server's own read-on-write view of state.
//
// The state shape comes straight from frontend/src/store/useStore.js DEF; the runtime fields
// that stay device-local (`active`) never reach the file — see api server.js PUT /api/data.
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.OPENGYM_DATA || path.join(process.cwd(), 'data')

// Cached state. `null` means "no state file for this user" (e.g. brand-new account that never
// signed in on a device). `undefined` means "not yet loaded".
let _state = undefined
let _db = undefined
let _uid = null
let _watcher = null
let _loadedMtime = 0    // mtimeMs we last read at — used to catch watcher omissions

/** A safe read of a JSON file; returns null on missing/invalid rather than throwing. */
function readJsonOrNull(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

function reloadDb() { _db = readJsonOrNull(path.join(DATA_DIR, 'db.json')) || { users: [], creds: [], subs: [], invites: [] } }

function stateFile(uid) {
  return path.join(DATA_DIR, 'state-' + uid.replace(/[^a-zA-Z0-9_-]/g, '') + '.json')
}

/**
 * Resolve which user the MCP server should answer for.
 *
 * Strategy, in order:
 *   1. OPENGYM_UID env — explicit choice on multi-user instances.
 *   2. Exactly one state file in ./data — the common self-hosted single-user case.
 *   3. Exactly one user in db.json with no state file yet — same intent, brand-new account.
 *   4. Otherwise: throw with the list of options so the user can pick.
 *
 * The uid pattern `^[a-zA-Z0-9_-]+$` matches what api/server.js emits (base64url of 12 random
 * bytes), and the sanitise on stateFile() above keeps a sneaky `..` in OPENGYM_UID harmless.
 */
function resolveUid() {
  const envUid = (process.env.OPENGYM_UID || '').trim()
  if (envUid) {
    if (!/^[a-zA-Z0-9_-]+$/.test(envUid)) throw new Error(`OPENGYM_UID contains characters that aren't safe in a filename: ${JSON.stringify(envUid)}`)
    return envUid
  }
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => /^state-[a-zA-Z0-9_-]+\.json$/.test(f))
    .map(f => f.replace(/^state-/, '').replace(/\.json$/, ''))
  if (files.length === 1) return files[0]
  if (files.length === 0) {
    reloadDb()
    if (_db.users.length === 1) return _db.users[0].id
    if (_db.users.length === 0) throw new Error(`no openGym users found in ${path.join(DATA_DIR, 'db.json')} — sign in at least once on a device`)
  }
  throw new Error(
    `multiple openGym users found — set OPENGYM_UID to one of: ${files.join(', ')}\n` +
    `  (look them up in ${path.join(DATA_DIR, 'db.json')} under "users"[].id)`
  )
}

/** Set up the live state view: pick the uid, load db.json, attach the watcher, prime state. */
export function init() {
  if (_uid !== null) return // idempotent
  if (!fs.existsSync(DATA_DIR)) throw new Error(`OPENGYM_DATA dir does not exist: ${DATA_DIR}`)
  _uid = resolveUid()
  reloadDb()
  const file = stateFile(_uid)
  if (fs.existsSync(file)) {
    _state = readJsonOrNull(file)
    if (_state) _state = Object.assign({}, defaultsShape(), _state)
    try { _loadedMtime = fs.statSync(file).mtimeMs } catch {}
  }
  if (_watcher) _watcher.close()
  // fs.watch is best-effort: the watcher may briefly drop events under some filesystems, but
  // its purpose is responsiveness (a tool call mid- ещё-one-sync), not durability — the api
  // server's atomic write at PUT /api/data is the source of truth, and a stale read just gets
  // corrected on the next change or the next tool call. We still re-read in getState() if the
  // cached state is older than the file's mtime — covers the worst case of a missed event.
  try {
    _watcher = fs.watch(file, () => {
      // On change, simply clear the cache — the next getState() will re-read. Avoids reading
      // twice if the watcher fires multiple events for one atomic-write (rename + create).
      _state = undefined
      _loadedMtime = 0
    })
  } catch { /* fs.watch unsupported on this platform; tools will re-read on mtime change */ }
}

/** Returns the state object (or null for a fresh account), re-reading on mtime change. */
export function getState() {
  init()
  const file = stateFile(_uid)
  // fs.watch's reliability varies by filesystem — we still re-read whenever the file's mtime
  // has changed since our last load. This covers watcher omissions, no-watcher platforms, and
  // a call landed in the brief gap between the api server's atomic write and our event firing.
  let mtime
  try { mtime = fs.statSync(file).mtimeMs } catch {
    // File no longer exists (account deleted since boot). Return what we have if anything;
    // the caller handles null/undefined same as a fresh account.
    return _state === undefined ? null : _state
  }
  if (_state === undefined || mtime !== _loadedMtime) {
    const fresh = readJsonOrNull(file)
    if (fresh) {
      // Same shape the frontend builds on pullState — defaults merged with stored state so any
      // field the app added since the snapshot was last saved shows up undefined-safe.
      _state = Object.assign({}, defaultsShape(), fresh)
      _loadedMtime = mtime
    } else if (_state === undefined) {
      _state = null  // no state file at all — never signed in on a device
    }
  }
  return _state
}

/** The user record (id + name) from db.json. Excludes passkeys/credentials and push subs. */
export function getUser() {
  init()
  const u = _db.users.find(x => x.id === _uid) || { id: _uid, name: 'Profile', created: null }
  return { id: u.id, name: u.name, created: u.created || null }
}

/** Path to the data dir (debug/test hook). */
export const dataDir = () => DATA_DIR

/**
 * Test-only escape hatch: work against a passed-in state object instead of reading disk.
 * The MCP server is read-only, so tests don't need to write files — pass any state object
 * (typically from frontend/src/lib/demoSeed.js buildDemoState()) and the tools will use it.
 */
export function _seedStateForTests(state) {
  _uid = 'test-uid'
  _db = { users: [{ id: _uid, name: 'Test', created: '2026-07-26T00:00:00.000Z' }], creds: [], subs: [], invites: [] }
  _state = state
  _loadedMtime = Number.MAX_SAFE_INTEGER   // never re-read from disk in a test
  if (_watcher) { _watcher.close(); _watcher = null }
}

/** The minimum shape the tools assume — fields default to empty/none if absent. */
function defaultsShape() {
  return {
    unit: 'kg', restSec: 90, sound: true, lang: 'en',
    theme: 'dark', accent: 'lime', body: 'male', targetW: null,
    bodyweight: [], routines: [], week: {}, dayPlan: {},
    exWeights: {}, workouts: [], customEx: [], gifSize: 'full',
    reminder: { on: false, time: '08:00', tz: null }
  }
}
