/* The photo, GIF or video of a custom exercise, as the state holds it — and its link.
 *
 * The state never carries the bytes, only a MediaRef of a few hundred bytes (see the shape
 * below). The bytes live in the device's local media store (lib/media-store.js) and, signed in,
 * on the server under DATA_DIR/uploads/<uid>/<sha256>.<ext> (api/media.js). Everything here is
 * pure and has no imports, so the store, the sync, the editor and the tests can all use it.
 *
 *   MediaRef = { kind: 'image'|'gif'|'video', hash, mime, size, width, height,
 *                dur?, codec?, poster?: { hash, mime, size, width, height }, at }
 *
 * A ref comes from outside whenever a state does: another device, a backup file, a plan file, a
 * hand-edited profile. So nothing trusts one as it stands. normalizeMediaRef() is the gate every
 * reader goes through, and anything it refuses is shown as "no media". cleanUrl() is the same
 * gate for the link, and it runs both when a link is saved and when one is opened.
 */

export const HASH_RE = /^[0-9a-f]{64}$/

/* The seven types that are ever stored, the same list as api/media.js MEDIA_TYPES. `playExt` is
   the name a file gets in the phone's own folder: the WebView's local server types a file by its
   extension, and it hands out .mov as something the <video> element will not play, while the same
   bytes named .mp4 play (a MOV and an MP4 are the same container). */
export const MEDIA_MIMES = {
  'image/jpeg': { kind: 'image', category: 'still', ext: 'jpg', playExt: 'jpg' },
  'image/png': { kind: 'image', category: 'still', ext: 'png', playExt: 'png' },
  'image/webp': { kind: 'image', category: 'still', ext: 'webp', playExt: 'webp' },
  'image/gif': { kind: 'gif', category: 'still', ext: 'gif', playExt: 'gif' },
  'video/mp4': { kind: 'video', category: 'video', ext: 'mp4', playExt: 'mp4' },
  'video/quicktime': { kind: 'video', category: 'video', ext: 'mov', playExt: 'mp4' },
  'video/webm': { kind: 'video', category: 'video', ext: 'webm', playExt: 'webm' }
}
// A poster is always a still this app encoded itself, so only the two formats the encoder writes.
const POSTER_MIMES = new Set(['image/webp', 'image/jpeg'])
export const CODECS = ['avc1', 'hvc1', 'av01', 'vp09', 'vp8', 'vp9', 'other']

const MB = 1024 * 1024
const MAX_SIZE = 200 * MB
const MAX_EDGE = 16384
const MAX_DUR = 3600
const MAX_URL = 2048

const intIn = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi

function cleanPoster(p) {
  if (!p || typeof p !== 'object') return null
  if (typeof p.hash !== 'string' || !HASH_RE.test(p.hash)) return null
  if (!POSTER_MIMES.has(p.mime)) return null
  if (!intIn(p.size, 1, MAX_SIZE) || !intIn(p.width, 1, MAX_EDGE) || !intIn(p.height, 1, MAX_EDGE)) return null
  return { hash: p.hash, mime: p.mime, size: p.size, width: p.width, height: p.height }
}

/**
 * A well-formed MediaRef, rebuilt from its known fields only, or null. null means "no media" to
 * every reader: a bad hash, a mime outside the allowlist or one that does not match `kind`, a
 * size outside 1 B..200 MB, a dimension outside 1..16384, a length outside 0..3600 s, or a codec
 * nobody knows. A malformed poster is dropped on its own; the main file still stands.
 */
export function normalizeMediaRef(ref) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return null
  const type = typeof ref.mime === 'string' ? MEDIA_MIMES[ref.mime] : null
  if (!type || ref.kind !== type.kind) return null
  if (typeof ref.hash !== 'string' || !HASH_RE.test(ref.hash)) return null
  if (!intIn(ref.size, 1, MAX_SIZE) || !intIn(ref.width, 1, MAX_EDGE) || !intIn(ref.height, 1, MAX_EDGE)) return null
  const out = { kind: ref.kind, hash: ref.hash, mime: ref.mime, size: ref.size, width: ref.width, height: ref.height }
  if (ref.dur != null) {
    if (typeof ref.dur !== 'number' || !Number.isFinite(ref.dur) || ref.dur < 0 || ref.dur > MAX_DUR) return null
    out.dur = Math.round(ref.dur * 10) / 10
  }
  if (ref.codec != null) {
    if (ref.kind !== 'video' || !CODECS.includes(ref.codec)) return null
    out.codec = ref.codec
  }
  const poster = cleanPoster(ref.poster)
  if (poster) out.poster = poster
  out.at = typeof ref.at === 'number' && Number.isFinite(ref.at) && ref.at > 0 ? Math.round(ref.at) : 0
  return out
}

/** The media of a custom exercise as it may be shown, or null. */
export const mediaOf = ex => (ex && ex.media ? normalizeMediaRef(ex.media) : null)

/**
 * Every blob hash a state refers to, the same answer as api/media.js referencedHashes (the shared
 * fixture api/test/fixtures/media-refs.json pins both). Deliberately looser than
 * normalizeMediaRef: each of media.hash and media.poster.hash counts on its own as long as it is a
 * well-formed hash, because this set decides what is KEPT, and keeping too much is the safe side.
 */
export function referencedHashes(state) {
  const out = new Set()
  const list = state && typeof state === 'object' && Array.isArray(state.customEx) ? state.customEx : []
  const add = r => { if (r && typeof r === 'object' && typeof r.hash === 'string' && HASH_RE.test(r.hash)) out.add(r.hash) }
  for (const c of list) {
    const m = c && typeof c === 'object' ? c.media : null
    if (!m || typeof m !== 'object') continue
    add(m)
    add(m.poster)
  }
  return out
}

/**
 * The same hashes in the order the sync wants them, posters first: a poster is what every list
 * shows, so it is the file another device most wants soon, and it is small. Each hash comes with
 * what the state says about it — { hash, mime, size, poster } — which is what a download is
 * checked against. The first ref that names a hash decides; two exercises with the same file
 * describe it the same way unless someone edited one by hand.
 */
export function referencedFiles(state) {
  const posters = new Map()
  const mains = new Map()
  const list = state && typeof state === 'object' && Array.isArray(state.customEx) ? state.customEx : []
  for (const c of list) {
    const m = c && typeof c === 'object' ? c.media : null
    if (!m || typeof m !== 'object') continue
    const p = m.poster
    if (p && typeof p === 'object' && typeof p.hash === 'string' && HASH_RE.test(p.hash) && !posters.has(p.hash)) {
      posters.set(p.hash, { hash: p.hash, mime: p.mime, size: p.size, poster: true })
    }
    if (typeof m.hash === 'string' && HASH_RE.test(m.hash) && !mains.has(m.hash)) {
      mains.set(m.hash, { hash: m.hash, mime: m.mime, size: m.size, poster: false })
    }
  }
  for (const h of posters.keys()) mains.delete(h)
  return [...posters.values(), ...mains.values()]
}

/**
 * A link as it may be stored and opened: http(s) only, no user name or password in it, at most
 * 2048 characters — or null. A bare "youtube.com/watch?v=…" gets https:// in front, the way people
 * paste links (#246). Anything else with a scheme of its own (javascript:, data:, mailto:, a
 * custom app scheme) is refused rather than guessed at. It runs at save and again at render,
 * because a plan file or a backup can bring any string in.
 */
export function cleanUrl(raw) {
  if (typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s || s.length > MAX_URL) return null
  if (!/^https?:\/\//i.test(s)) {
    if (/^[a-z0-9+.-]+:/i.test(s)) return null
    s = 'https://' + s
  }
  let u
  try { u = new URL(s) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (!u.hostname || u.username || u.password) return null
  return u.href.length <= MAX_URL ? u.href : null
}

// Hosts whose pages are, in practice, a video: the card then says "Watch video" instead of
// "Open link". Only the wording changes — nothing is fetched or embedded either way.
const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'instagram.com']

/** 'video' for a link to a video site, 'link' for anything else, null for no usable link. */
export function linkKind(url) {
  const u = cleanUrl(url)
  if (!u) return null
  const host = new URL(u).hostname.toLowerCase()
  return VIDEO_HOSTS.some(d => host === d || host.endsWith('.' + d)) ? 'video' : 'link'
}

/** m:ss for a length in seconds ("0:07", "1:05"). */
export function fmtClip(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}
