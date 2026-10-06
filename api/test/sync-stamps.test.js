/* PUT /api/data's stamping (sync-stamps.js): the records of removals and edits never shrink, a
   writer that does not stamp (an older app, an API planner) gets what it changed stamped, and an
   entry held against a removal on record is kept as added back. Unit cases first, then the real
   server.js in a child. (QA 2026-10-06: an offline v1.3.9 phone wiped the RC's removal records; a
   planner's new week was undone by a phone that reconnected with an older change.) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';
import { stampPut } from '../sync-stamps.js';

const clone = v => JSON.parse(JSON.stringify(v));
const NOW = 1_800_000_000_000;
const stored = () => ({
  _ts: NOW - 5000, _rev: 3, restSec: 90, queue: { ids: ['a'] }, week: { 1: 'r1' },
  workouts: [{ id: 'w1', d: '2026-10-01', start: 1, end: 2 }, { id: 'w2', d: '2026-10-02', start: 3, end: 4 }],
  routines: [{ id: 'r1', name: 'Push', ex: [], _ts: NOW - 9000 }, { id: 'r2', name: 'Pull', ex: [], _ts: NOW - 9000 }],
  favEx: ['bench'],
  deleted: { workouts: { w9: NOW - 4000 } }, edited: { restSec: NOW - 4000 },
});

test('an older app\'s push over the current revision keeps the records and gets its changes stamped', () => {
  const cur = stored();
  const next = clone(cur);
  delete next.deleted; delete next.edited; delete next._rev   // v1.3.9 never knew them
  next.workouts = next.workouts.filter(w => w.id !== 'w2')    // its delete
  next.restSec = 120                                           // its setting
  next.routines[0].name = 'Push A'                             // its routine edit, no stamp of its own
  stampPut(cur, next, { overRead: true, stamped: false, now: NOW });
  assert.equal(next.deleted.workouts.w9, NOW - 4000);         // kept
  assert.ok(next.deleted.workouts.w2 >= NOW);                  // stamped
  assert.ok(next.edited.restSec >= NOW);
  assert.ok(next.routines[0]._ts >= NOW);
  assert.ok(next.routines[0]._f.name >= NOW);
  assert.equal(next.routines[1]._ts, NOW - 9000);              // untouched
});

test('a planner\'s queue and removed routine are stamped; a field it does not send is left alone', () => {
  const cur = stored();
  cur.hints = { swipeSets: true };
  const next = clone(cur);
  delete next.hints;
  next.queue = { ids: ['b'] };
  next.routines = next.routines.filter(r => r.id !== 'r2');
  stampPut(cur, next, { overRead: true, now: NOW });
  assert.ok(next.edited.queue >= NOW);
  assert.ok(next.deleted.routines.r2 >= NOW);
  assert.equal(next.edited.hints, undefined);
});

test('the app stamps its own changes: only the records are joined', () => {
  const cur = stored();
  const next = clone(cur);
  next.edited = { restSec: NOW - 100 };
  next.restSec = 60;
  next.workouts = next.workouts.filter(w => w.id !== 'w2');   // a delete it stamps itself
  next.deleted = { workouts: { w2: NOW - 100 } };
  stampPut(cur, next, { overRead: true, stamped: true, now: NOW });
  assert.deepEqual(next.deleted.workouts, { w9: NOW - 4000, w2: NOW - 100 });
  assert.equal(next.edited.restSec, NOW - 100);
});

test('an entry held against a removal on record is kept, marked as added back', () => {
  const cur = stored();
  cur.deleted.favEx = { squat: NOW - 4000 };
  cur.deleted.workouts.w1 = NOW - 4000;   // a document an older app's merge left inconsistent
  const next = clone(cur);
  next.favEx = ['bench', 'squat'];        // starred again on an older app
  stampPut(cur, next, { overRead: true, now: NOW });
  assert.ok(next.deleted.favEx.squat < 0);
  assert.ok(next.deleted.workouts.w1 < 0);
  assert.deepEqual(next.workouts.map(w => w.id), ['w1', 'w2']);
});

test('a reset keeps its own records; a replace without baseRev keeps the stored ones', () => {
  const cur = stored();
  const reset = { _ts: NOW, resetAt: NOW, workouts: [], routines: [] };
  stampPut(cur, reset, { overRead: false, stamped: true, now: NOW });
  assert.equal(reset.deleted, undefined);
  const replace = { _ts: NOW, workouts: [{ id: 'w9', d: '2026-09-01', start: 1, end: 2 }], routines: [] };
  stampPut(cur, replace, { overRead: false, now: NOW });
  assert.ok(replace.deleted.workouts.w9 < 0);   // the restored workout is kept and stays
  assert.equal(replace.edited.restSec, NOW - 4000);
});

// ---- the real server -------------------------------------------------------------------------
const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = crypto.randomBytes(32).toString('hex');
function mintSession(uid) {
  const payload = `${uid}:${Date.now() + 86400000}:0`;
  return payload + '.' + crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}
test('PUT /api/data: an older app\'s push does not wipe the records, and its delete is stamped', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-stamps-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ users: [{ id: 'u1', name: 'One', created: new Date().toISOString() }], creds: [], subs: [], invites: [] }));
  const child = spawn(process.execPath, ['server.js'], { cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' } });
  let log = '';
  child.stdout.on('data', d => log += d); child.stderr.on('data', d => log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${await boundPort(child, () => log)}`;
  const headers = { Cookie: `gymsid=${mintSession('u1')}`, 'Content-Type': 'application/json' };
  const put = async body => { const r = await fetch(`${base}/api/data`, { method: 'PUT', headers, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  const get = async () => (await fetch(`${base}/api/data`, { headers })).json();

  // the RC app pushes a delete it stamped itself
  let r = await put({ state: { _ts: 1, workouts: [{ id: 'w2', d: '2026-10-02', start: 3, end: 4 }], routines: [], deleted: { workouts: { w1: 1000 } } }, stamped: true });
  assert.equal(r.status, 200);
  // an older app, which read rev 1, pushes its copy without the records and with w2 deleted
  r = await put({ state: { _ts: 2, workouts: [], routines: [] }, baseRev: 1 });
  assert.equal(r.status, 200);
  const doc = (await get()).state;
  assert.equal(doc.deleted.workouts.w1, 1000);
  assert.ok(doc.deleted.workouts.w2 > 1000);
});
