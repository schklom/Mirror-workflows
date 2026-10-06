/* An unreadable db.json (a write cut short by a power loss, a damaged restore) booted with zero
   users and the first save replaced it: every profile locked out, every history orphaned, the
   first visitor admin under FIRST_USER_ADMIN. And an unreadable state file read as "no state yet",
   which a device adopted and a write replaced. (QA 2026-10-06.) Real server.js in a child. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = crypto.randomBytes(32).toString('hex');
const cookie = uid => { const p = `${uid}:${Date.now() + 86400000}:0`; return `gymsid=${p}.${crypto.createHmac('sha256', SECRET).update(p).digest('base64url')}`; };
const USERS = [{ id: 'u_a', name: 'Anna', created: new Date().toISOString() }, { id: 'u_b', name: 'Bruno', created: new Date().toISOString() }];

function dataDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-dbx-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  fs.writeFileSync(path.join(d, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(d, 'db.json'), JSON.stringify({ users: USERS, creds: [], subs: [], invites: [] }));
  return d;
}
function start(t, d) {
  const child = spawn(process.execPath, ['server.js'], { cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: d, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' } });
  const h = { log: '', child };
  child.stdout.on('data', x => h.log += x); child.stderr.on('data', x => h.log += x);
  h.exit = new Promise(r => child.on('exit', code => r(code)));
  t.after(() => child.kill('SIGKILL'));
  return h;
}

test('db.json cut short with no previous version: the server refuses to start and keeps the file', async t => {
  const d = dataDir(t);
  const full = fs.readFileSync(path.join(d, 'db.json'), 'utf8');
  fs.writeFileSync(path.join(d, 'db.json'), full.slice(0, full.length >> 1));
  const h = start(t, d);
  assert.equal(await h.exit, 1);
  assert.match(h.log, /Refusing to start/);
  assert.equal(fs.readFileSync(path.join(d, 'db.json'), 'utf8'), full.slice(0, full.length >> 1));
  assert.ok(fs.readdirSync(d).some(f => f.startsWith('db.json.unreadable-')));
});

test('db.json cut short after a save: the version before it is used, and every account is still there', async t => {
  const d = dataDir(t);
  let h = start(t, d);
  const base = `http://127.0.0.1:${await boundPort(h.child, () => h.log)}`;
  await fetch(`${base}/api/data`, { headers: { Cookie: cookie('u_a') } });   // a pull note saves db.json
  assert.ok(fs.existsSync(path.join(d, 'db.json.bak')));
  h.child.kill('SIGKILL'); await h.exit;
  fs.writeFileSync(path.join(d, 'db.json'), '');
  h = start(t, d);
  const base2 = `http://127.0.0.1:${await boundPort(h.child, () => h.log)}`;
  const me = await (await fetch(`${base2}/api/me`, { headers: { Cookie: cookie('u_b') } })).json();
  assert.equal(me.user?.id, 'u_b');
  assert.match(h.log, /using db\.json\.bak/);
});

test('an unreadable state file is a 503 on GET and PUT, and is not replaced', async t => {
  const d = dataDir(t);
  fs.writeFileSync(path.join(d, 'state-u_a.json'), '{"_rev":7,"workouts":[{"id":"w1"');
  const h = start(t, d);
  const base = `http://127.0.0.1:${await boundPort(h.child, () => h.log)}`;
  const headers = { Cookie: cookie('u_a'), 'Content-Type': 'application/json' };
  assert.equal((await fetch(`${base}/api/data`, { headers })).status, 503);
  const put = await fetch(`${base}/api/data`, { method: 'PUT', headers, body: JSON.stringify({ state: { workouts: [], routines: [] } }) });
  assert.equal(put.status, 503);
  assert.equal(fs.readFileSync(path.join(d, 'state-u_a.json'), 'utf8'), '{"_rev":7,"workouts":[{"id":"w1"');
});
