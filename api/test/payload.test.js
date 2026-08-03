import test from 'node:test';
import assert from 'node:assert/strict';
import { tempData, sampleState } from './helpers.mjs';

tempData();
const payload = await import('../coach/payload.js');

/* The promise the consent screen makes is only as good as this test. It asserts on the
   *absence* of things, which is the awkward direction to test and the only one that matters:
   a field added to the state blob next year must not be able to ride along. */
test('payload never carries identity, credentials or device data', () => {
  const S = sampleState({
    // Everything below is either private, irrelevant to coaching, or both — and all of it is
    // realistically present in a live state blob.
    theme: 'dark', accent: 'lime', body: 'male', gifSize: 'full',
    reminder: { on: true, time: '08:00', tz: 'Europe/Lisbon' },
    _ts: Date.now()
  });
  const p = payload.build(S, 'user-abc-123', { kind: 'review' });
  const json = JSON.stringify(p);

  assert.ok(!json.includes('user-abc-123'), 'the uid must never appear');
  assert.equal(p.meta.profile.length, 16, 'an opaque handle stands in for the uid');
  for (const forbidden of ['theme', 'accent', 'gifSize', 'reminder', 'Europe/Lisbon', 'passkey', 'credential', 'subscription', 'invite']) {
    assert.ok(!json.includes(forbidden), `payload leaked ${forbidden}`);
  }
});

test('the same profile always gets the same handle, and two profiles never share one', () => {
  const S = sampleState();
  const a1 = payload.build(S, 'uid-a', { kind: 'review' }).meta.profile;
  const a2 = payload.build(S, 'uid-a', { kind: 'review' }).meta.profile;
  const b = payload.build(S, 'uid-b', { kind: 'review' }).meta.profile;
  assert.equal(a1, a2);
  assert.notEqual(a1, b);
});

test('review payload carries the plan, the window, effort and aggregates', () => {
  const p = payload.build(sampleState(), 'u1', { kind: 'review', note: 'shoulder pinches' });
  assert.equal(p.task, 'review');
  assert.equal(p.plan.routines.length, 1);
  assert.equal(p.plan.routines[0].ex[0].name, '3/4 sit-up', 'exercise names are resolved for the model');
  assert.equal(p.window.workouts.length, 1);
  assert.equal(p.window.workouts[0].entries[0].sets[0].rpe, 9.5, 'effort survives into the payload');
  assert.equal(p.userNote, 'shoulder pinches');
  assert.equal(p.meta.effortScale, 'rpe');
  assert.ok(p.aggregates.adherence.plannedPerWeek === 3);
  assert.ok(Array.isArray(p.library) && p.library.length > 0);
});

test('a stalling exercise shows up in the aggregates the way the engine counts it', () => {
  const S = sampleState();
  // Three sessions that all fell short of the 10-rep target.
  S.workouts = ['2026-07-06', '2026-07-13', '2026-07-20'].map((d, i) => ({
    id: 'w' + i, d, name: 'A', start: 0, end: 60000, entries: [{
      id: '0001', target: { sets: 3, reps: 10, weight: 20 },
      sets: [{ w: 20, r: 9, done: true }, { w: 20, r: 8, done: true }, { w: 20, r: 7, done: true }]
    }]
  }));
  const p = payload.build(S, 'u1', { kind: 'review' });
  const ex = p.aggregates.exercises.find(e => e.id === '0001');
  assert.equal(ex.stalls, 3, 'three misses in a row is a stall of three');
  assert.equal(ex.lastOk, false);
});

test('a set that was never ticked off is a miss, not a gap', () => {
  const S = sampleState();
  S.workouts = [{
    id: 'w1', d: '2026-07-20', name: 'A', start: 0, end: 60000, entries: [{
      id: '0001', target: { sets: 3, reps: 10, weight: 20 },
      sets: [{ w: 20, r: 10, done: true }, { w: 20, r: 10, done: true }, { w: 20, r: 10, done: false }]
    }]
  }];
  const p = payload.build(S, 'u1', { kind: 'review' });
  assert.equal(p.aggregates.exercises.find(e => e.id === '0001').stalls, 1);
});

test('the review window is bounded even for someone with years of history', () => {
  const S = sampleState();
  S.workouts = Array.from({ length: 200 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return { id: 'w' + i, d: d.toISOString().slice(0, 10), name: 'A', start: 0, end: 60000, entries: [] };
  }).reverse();
  const p = payload.build(S, 'u1', { kind: 'review' });
  assert.ok(p.window.workouts.length <= payload.MAX_SESSIONS, 'session cap holds');
  const oldest = new Date(p.window.workouts[0].d);
  const limit = new Date(); limit.setDate(limit.getDate() - payload.MAX_WEEKS * 7 - 1);
  assert.ok(oldest >= limit, 'nothing older than the week cap gets in');
});

test('creation payload carries working weights so baselines start from evidence', () => {
  const p = payload.build(sampleState(), 'u1', { kind: 'create' });
  assert.equal(p.task, 'create');
  assert.ok(!p.window, 'creation does not ship the training window');
  assert.equal(p.history.workingWeights.find(w => w.id === '0001').best, 20);
});

test('the library is filtered to the equipment someone actually has', () => {
  const all = payload.librarySlice({}, []).length;
  const dumbbell = payload.librarySlice({}, ['dumbbell']).length;
  assert.ok(dumbbell < all && dumbbell > 0);
  // Custom exercises always travel: they exist nowhere else and the model cannot guess them.
  const withCustom = payload.librarySlice({ customEx: [{ id: 'cx1', n: 'Sandbag carry', bp: 'back' }] }, ['dumbbell']);
  assert.equal(withCustom[0].id, 'cx1');
});

test('equipment nobody in the library has still yields a usable library', () => {
  // Better a slightly larger payload than a Coach that cannot propose anything at all.
  assert.ok(payload.librarySlice({}, ['moon rocks']).length > 0);
});

test('declined changes are carried forward so the Coach does not nag', () => {
  const S = sampleState();
  S.coach.log = [{ decisions: [{ status: 'rejected', type: 'sets', why: 'bench accessory volume -1 set' }] }];
  const p = payload.build(S, 'u1', { kind: 'review' });
  assert.equal(p.previouslyDeclined.length, 1);
  assert.equal(p.previouslyDeclined[0].type, 'sets');
});
