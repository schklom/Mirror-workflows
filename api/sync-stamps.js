// The server's half of the sync stamps. Hand-copied (not imported) from
// frontend/src/lib/sync-merge.js, like queue.js: the same rules on both sides, kept as a small
// standalone module so it can be unit-tested without booting the server, and checked against the
// frontend's copy by frontend/src/lib/sync-stamps-parity.test.js.
//
// The app stamps every change itself: `deleted` records what was removed and when, `edited` when
// each setting and plan day was last changed, and every routine, custom exercise, profile, card
// and edited workout carries its own `_ts` (and `_f`, per field). Two kinds of writer do not:
//
//   - an older app (v1.3.9 and before), which knows none of it. It pushed back whatever it had
//     read without the records, so one offline phone wiped every removal on record and the RC's
//     devices brought back what had been deleted; its own deletes and setting changes carried no
//     stamp and lost to older ones made on an updated device.
//   - an API client: a planner that GETs, changes the queue or a routine, and PUTs. Its new week
//     lost to any phone that reconnected with an older, unrelated change.
//
// So PUT /api/data (stampPut):
//   1. never lets the records shrink: `deleted` and `edited` are joined with the stored ones (but
//      a reset, which starts the profile over, keeps its own);
//   2. for a writer that does not stamp (no `stamped: true` in the body) and wrote over the
//      revision it read: stamps what it changed against the stored copy, at the server's time —
//      entries removed, settings and plan days changed, entries edited;
//   3. for every writer: an entry the document holds while a removal on record says it was
//      deleted after its last edit is kept, and marked as added back. An updated app never sends
//      such a document, so this is an older app's merge (or its Coach undo, or a backup it
//      restored) bringing an entry back, and that cannot be told apart from a deliberate re-add:
//      a deleted entry that comes back is one tap to remove again, a wanted one dropped is lost.

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);
const list = v => (Array.isArray(v) ? v : []);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

const workoutKey = w => (w?.id != null ? w.id : `${w?.d}|${w?.start}`);
const workoutTime = w => Number(w?._ts) || Number(w?.end) || Number(w?.start) || 0;
export const DEL_LISTS = {
  workouts: workoutKey, routines: x => x?.id, customEx: x => x?.id, bodyweight: e => e?.d,
  gymCards: x => x?.id, equipProfiles: x => x?.id, favEx: x => x,
};
const DEL_TIME = {
  workouts: workoutTime, routines: x => Number(x?._ts) || 0, customEx: x => Number(x?._ts) || 0,
  bodyweight: e => Number(e?.t) || 0, gymCards: x => Number(x?._ts) || 0, equipProfiles: x => Number(x?._ts) || 0,
};
export const DELETED_MAX = 5000;
const capStamps = m => {
  const ks = Object.keys(m);
  if (ks.length <= DELETED_MAX) return m;
  ks.sort((x, y) => Math.abs(m[x]) - Math.abs(m[y]));
  for (const k of ks.slice(0, ks.length - DELETED_MAX)) delete m[k];
  return m;
};
const OWN_MERGE = new Set([
  '_ts', '_rev', 'active', 'unit', 'unitSet', 'resetAt', 'resetIds', 'deleted', 'edited',
  'workouts', 'routines', 'customEx', 'equipProfiles', 'gymCards', 'bodyweight', 'favEx',
  'exWeights', 'balanceOverrides', 'loadKind', 'plates',
]);
const PER_KEY = new Set(['week', 'dayPlan', 'exNotes', 'barWeights']);
const ENTRY_META = new Set(['id', '_ts', '_f']);
const ENTRY_LISTS = ['routines', 'customEx', 'equipProfiles', 'gymCards', 'workouts'];

// Whether removal record `v` replaces `cur`: the later stamp, and on a tie the add-back.
const laterDel = (v, cur) => {
  const x = Number(v) || 0, y = Number(cur) || 0;
  return Math.abs(x) > Math.abs(y) || (Math.abs(x) === Math.abs(y) && x < y);
};
/** Both records of removals: per entry, the later stamp. */
export function mergeDeletions(a, b) {
  const out = {};
  for (const f of Object.keys(DEL_LISTS)) {
    const x = isMap(a?.[f]) ? a[f] : {}, y = isMap(b?.[f]) ? b[f] : {};
    const m = { ...x };
    // On equal stamps the add-back (negative) wins, whichever copy is first (as the app's).
    for (const [k, v] of Object.entries(y)) if (!(k in m) || laterDel(v, m[k])) m[k] = v;
    if (Object.keys(m).length) out[f] = capStamps(m);
  }
  return Object.keys(out).length ? out : null;
}

/** Both records of edits: per key, the later stamp. */
export function mergeEdits(a, b) {
  const x = isMap(a) ? a : {}, y = isMap(b) ? b : {};
  const out = { ...x };
  for (const [k, v] of Object.entries(y)) if (!((Number(out[k]) || 0) >= (Number(v) || 0))) out[k] = v;
  return Object.keys(out).length ? out : null;
}

/** The latest stamp a copy carries (sync-merge.js highestStamp). */
export function highestStamp(S) {
  let m = 0;
  const see = v => { const n = Math.abs(Number(v) || 0); if (n > m) m = n; };
  if (!S || typeof S !== 'object') return 0;
  see(S._ts); see(S.unitSet?.at); see(S.resetAt);
  if (isMap(S.edited)) for (const v of Object.values(S.edited)) see(v);
  if (isMap(S.deleted)) for (const f of Object.values(S.deleted)) if (isMap(f)) for (const v of Object.values(f)) see(v);
  for (const f of ENTRY_LISTS) {
    for (const x of list(S[f])) {
      if (!x || typeof x !== 'object') continue;
      see(x._ts);
      if (isMap(x._f)) for (const v of Object.values(x._f)) see(v);
    }
  }
  for (const f of ['balanceOverrides', 'loadKind', 'plates']) {
    if (isMap(S[f])) for (const v of Object.values(S[f])) see(isMap(v) ? v._ts : 0);
  }
  return m;
}

/** `x` stamped as an edit of `old` at `now`, per field (sync-merge.js stampEntry). Mutates `x`. */
export function stampEntry(old, x, now) {
  if (!x || typeof x !== 'object') return x;
  x._ts = now;
  if (!old || typeof old !== 'object') return x;
  const f = isMap(old._f) ? { ...old._f } : {};
  for (const k of new Set([...Object.keys(old), ...Object.keys(x)])) {
    if (ENTRY_META.has(k)) continue;
    if ((k in old) !== (k in x) || !same(old[k], x[k])) f[k] = now;
  }
  if (Object.keys(f).length) x._f = f; else delete x._f;
  return x;
}
const sameEntry = (a, b) => same({ ...a, _ts: 0, _f: 0 }, { ...b, _ts: 0, _f: 0 });

// Step 2: what a writer that does not stamp changed against the copy it read, stamped at `now`.
function stampUnstamped(cur, next, sent, now) {
  // Removals: every entry the stored copy had and this one lacks, unless already on record.
  const del = isMap(next.deleted) ? next.deleted : {};
  for (const [f, key] of Object.entries(DEL_LISTS)) {
    const time = DEL_TIME[f] || (() => 0);
    const have = new Set(list(next[f]).filter(x => x != null).map(x => String(key(x))));
    for (const x of list(cur[f])) {
      if (x == null) continue;
      const k = String(key(x));
      if (have.has(k)) continue;
      const m = isMap(del[f]) ? del[f] : (del[f] = {});
      if (!(Number(m[k]) > 0 && Number(m[k]) >= time(x))) m[k] = Math.max(now, time(x) + 1);
    }
    if (isMap(del[f])) capStamps(del[f]);
  }
  if (Object.keys(del).length) next.deleted = del;
  // Settings and plan days changed, whose stamp the writer did not move past the stored one.
  const ed = isMap(next.edited) ? next.edited : {};
  const mine = isMap(sent) ? sent : {}, theirs = isMap(cur.edited) ? cur.edited : {};
  const moved = k => (Number(mine[k]) || 0) > (Number(theirs[k]) || 0);
  for (const k of new Set([...Object.keys(cur), ...Object.keys(next)])) {
    if (OWN_MERGE.has(k)) continue;
    const p = cur[k], n = next[k];
    if (PER_KEY.has(k)) {
      const pm = isMap(p) ? p : {}, nm = isMap(n) ? n : {};
      for (const s of new Set([...Object.keys(pm), ...Object.keys(nm)])) {
        const sk = `${k}.${s}`;
        if (((s in pm) !== (s in nm) || !same(pm[s], nm[s])) && !moved(sk)) ed[sk] = now;
      }
    } else if (n !== undefined && !same(p, n) && !moved(k)) ed[k] = now;   // absent: a field the writer does not know
  }
  if (Object.keys(ed).length) next.edited = ed;
  // Entries edited without a stamp of their own: a routine, a custom exercise, a profile, a card,
  // a workout whose content changed while its `_ts` did not move.
  for (const f of ENTRY_LISTS) {
    const before = new Map(list(cur[f]).filter(x => x && x.id != null).map(x => [x.id, x]));
    for (const x of list(next[f])) {
      if (!x || typeof x !== 'object' || x.id == null) continue;
      const old = before.get(x.id);
      if (!old) { if (f !== 'workouts' && x._ts == null) x._ts = now; continue; }
      if ((Number(x._ts) || 0) > (Number(old._ts) || 0) || sameEntry(old, x)) continue;
      stampEntry(old, x, now);
    }
  }
}

// Step 3: an entry held while a removal on record says it was deleted after its last edit is
// kept, and marked as added back.
function keepHeld(next, now) {
  const del = next.deleted;
  if (!isMap(del)) return;
  for (const [f, key] of Object.entries(DEL_LISTS)) {
    const m = del[f];
    if (!isMap(m)) continue;
    const time = DEL_TIME[f] || (() => 0);
    for (const x of list(next[f])) {
      if (x == null) continue;
      const k = String(key(x));
      const at = Number(m[k]) || 0;
      if (at > 0 && at >= time(x)) m[k] = -Math.max(now, at + 1);
    }
  }
}

/**
 * PUT /api/data's stamping (see the top of this file). `cur` is the stored document (or null),
 * `next` the one being written (mutated in place), `opts.overRead` true when the writer sent the
 * revision it read and it is the current one, `opts.stamped` true for a writer that stamps its own
 * changes (the app), `opts.now` the server's clock.
 */
export function stampPut(cur, next, { overRead = false, stamped = false, now = Date.now() } = {}) {
  if (!next || typeof next !== 'object') return next;
  const t = Math.max(Number(now) || 0, highestStamp(cur) + 1, highestStamp(next) + 1);
  const reset = (Number(next.resetAt) || 0) > (Number(cur?.resetAt) || 0);
  const sent = isMap(next.edited) ? { ...next.edited } : null;
  if (cur && !reset) {
    const d = mergeDeletions(cur.deleted, next.deleted);
    if (d) next.deleted = d; else delete next.deleted;
    const e = mergeEdits(cur.edited, next.edited);
    if (e) next.edited = e; else delete next.edited;
    if (!stamped && overRead) stampUnstamped(cur, next, sent, t);
  }
  keepHeld(next, t);
  return next;
}
