/* End-to-end through the real queue and a real child process — the only fake is the provider
   itself. Every outcome the user can be shown is reachable here without an AI account, which
   is the whole reason the fixture CLI exists.

   This PR stops at transport: a job runs, exits, and its answer is parsed. The validator and
   the apply path arrive next, and the tests that assert them travel with them. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempData, writeState, sampleState } from './helpers.mjs';

const DIR = tempData();
const cfg = await import('../coach/config.js');
const jobs = await import('../coach/jobs.js');

cfg.save({ enabled: true, provider: 'fixture' });

/** Jobs are async by design; the tests wait the way the client does — by polling status. */
async function settle(uid, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const s = jobs.status(uid);
    if (!s.job) return s;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error('job never finished');
}
const lastOutcome = uid => jobs.readUser(uid).history.at(-1);



test('no consent, no job — the gate is on the server, not the screen', () => {
  const uid = 'u-noconsent';
  writeState(DIR, uid, sampleState({ coach: {} }));
  assert.throws(() => jobs.enqueue(uid, { kind: 'review' }), e => e.code === 'consent');
});

test('one job per profile at a time', async () => {
  const uid = 'u-single';
  writeState(DIR, uid, sampleState());
  jobs.enqueue(uid, { kind: 'review' });
  assert.throws(() => jobs.enqueue(uid, { kind: 'review' }), e => e.code === 'busy');
  await settle(uid);
});

test('the daily cap is enforced and reported as its own failure', async () => {
  const uid = 'u-cap';
  writeState(DIR, uid, sampleState());
  cfg.save({ caps: { perProfileDaily: 1, instanceDaily: 0 } });
  jobs.enqueue(uid, { kind: 'review' });
  await settle(uid);
  assert.throws(() => jobs.enqueue(uid, { kind: 'review' }), e => e.code === 'cap');
  assert.equal(jobs.capState(uid).used, 1);
  cfg.save({ caps: { perProfileDaily: 10, instanceDaily: 0 } });
});


test('an answer that stays unusable fails cleanly and applies nothing', async () => {
  const uid = 'u-unusable';
  writeState(DIR, uid, sampleState());
  process.env.FIXTURE_MODE = 'invalid';
  jobs.enqueue(uid, { kind: 'review' });
  const s = await settle(uid);
  delete process.env.FIXTURE_MODE;
  const last = lastOutcome(uid);
  assert.equal(last.outcome, 'failed');
  assert.equal(last.errorClass, 'unusable');
  assert.equal(s.pending, null, 'nothing partial is ever left behind');
});

test('a provider that crashes is reported, not retried behind the user\'s back', async () => {
  const uid = 'u-crash';
  writeState(DIR, uid, sampleState());
  process.env.FIXTURE_MODE = 'crash';
  jobs.enqueue(uid, { kind: 'review' });
  await settle(uid);
  delete process.env.FIXTURE_MODE;
  assert.equal(lastOutcome(uid).outcome, 'failed');
  assert.equal(jobs.readUser(uid).history.filter(h => h.outcome === 'failed').length, 1, 'exactly one attempt');
});



test('an expired proposal disappears on read rather than lingering forever', async () => {
  const uid = 'u-expire';
  writeState(DIR, uid, sampleState());
  jobs.enqueue(uid, { kind: 'review' });
  await settle(uid);
  const rec = jobs.readUser(uid);
  rec.pending.expiresAt = Date.now() - 1;
  fs.writeFileSync(`${DIR}/coach/${uid}.json`, JSON.stringify(rec));
  assert.equal(jobs.status(uid).pending, null);
  assert.equal(lastOutcome(uid).outcome, 'expired');
});

test('forgetting a profile leaves no server-side residue', async () => {
  const uid = 'u-forget';
  writeState(DIR, uid, sampleState());
  jobs.enqueue(uid, { kind: 'review' });
  await settle(uid);
  jobs.clearUser(uid);
  const s = jobs.status(uid);
  assert.equal(s.pending, null);
  assert.deepEqual(jobs.readUser(uid).history, []);
});

test('a job interrupted by a restart is reported as failed, not left spinning', () => {
  const uid = 'u-restart';
  fs.mkdirSync(`${DIR}/coach`, { recursive: true });
  fs.writeFileSync(`${DIR}/coach/${uid}.json`, JSON.stringify({
    current: { id: 'j1', kind: 'review', state: 'running', startedAt: Date.now() - 60000 }, history: []
  }));
  jobs.recoverOnBoot();
  assert.equal(jobs.status(uid).job, null);
  assert.equal(lastOutcome(uid).errorClass, 'restart');
});

test('the plan fingerprint moves when the plan does, and only then', async () => {
  const payload = await import('../coach/payload.js');
  const plan = payload.canonicalPlan({ routines: [{ id: 'r1', name: 'A', ex: [{ id: '0001', sets: 3, reps: 10 }] }], week: { 1: 'r1' } });
  const same = payload.canonicalPlan({ routines: [{ id: 'r1', name: 'A', ex: [{ id: '0001', sets: 3, reps: 10, weight: 0 }] }], week: { 1: 'r1' } });
  const moved = payload.canonicalPlan({ routines: [{ id: 'r1', name: 'A', ex: [{ id: '0001', sets: 4, reps: 10 }] }], week: { 1: 'r1' } });
  assert.equal(jobs.hashPlan(plan), jobs.hashPlan(same));
  assert.notEqual(jobs.hashPlan(plan), jobs.hashPlan(moved));
});


test('the answer is carried no further than parsed — nothing here can apply it', async () => {
  const uid = 'u-seam';
  writeState(DIR, uid, sampleState());
  jobs.enqueue(uid, { kind: 'review' });
  const s = await settle(uid);

  assert.equal(lastOutcome(uid) === undefined || s.pending !== null, true);
  assert.ok(s.pending, 'a parsed answer is held for the user');
  // The seam this PR draws: an answer that parsed, and no judgement about it. PR 2 replaces
  // `unvalidated` with a checked proposal, and this assertion with the real shape.
  assert.ok(Object.hasOwn(s.pending, 'unvalidated'), 'the answer is explicitly unvalidated');
  assert.equal(s.pending.bundle, undefined, 'no applyable bundle exists yet');
  assert.equal(s.pending.proposal, undefined, 'no applyable proposal exists yet');
});

test('a job is refused outright when the privilege drop cannot be performed', () => {
  // Linux-only: on a developer's macOS box there is no container boundary to drop across, so
  // canDropPrivileges stays permissive and there is nothing to assert.
  if (process.platform !== 'linux') return;
  const uid = 'u-priv';
  writeState(DIR, uid, sampleState());
  const { canDropPrivileges } = require('../coach/adapters/spawn.js');
  if (canDropPrivileges().ok) return;   // running as root in CI with a coach user present
  assert.throws(() => jobs.enqueue(uid, { kind: 'review' }), /switched off|disabled/i);
});
