/* What a person typed is bounded before it reaches a prompt.
 *
 * The intake screen caps its text fields, but payload.build reads the profile from a POST body
 * or from the synced state, and a client can put megabytes in either. The Coach runs on the
 * instance's own key, so an unbounded field is a bill someone else pays. These tests feed the
 * builder far more than any screen allows, through both doors, and check what comes out. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tempData, sampleState } from './helpers.mjs';

tempData();
const payload = await import('../coach/core/payload.js');

const HUGE = 'x'.repeat(200_000);
const hugeProfile = () => ({
  goal: 'strength' + HUGE,
  experience: 'regular' + HUGE,
  daysPerWeek: '99',
  preferredDays: [...Array(5000)].map((_, i) => i % 9).concat(['1', 'Monday', null, 2.5]),
  sessionMin: 1e9,
  equipment: [...Array(5000)].map((_, i) => (i === 0 ? 'dumbbell' : 'eq' + i + HUGE.slice(0, 500))),
  limitations: HUGE, likes: HUGE, dislikes: HUGE, notes: HUGE
});

function assertBounded(cp) {
  assert.equal(cp.limitations.length, 600);
  assert.equal(cp.likes.length, 300);
  assert.equal(cp.dislikes.length, 300);
  assert.equal(cp.notes.length, 600);
  assert.equal(cp.goal.length, payload.PROFILE_WORD_MAX);
  assert.ok(cp.goal.startsWith('strength'));
  assert.equal(cp.experience.length, payload.PROFILE_WORD_MAX);
  assert.equal(cp.daysPerWeek, 7, 'clamped to a week');
  assert.deepEqual(cp.preferredDays, [0, 1, 2, 3, 4, 5, 6], 'weekdays only, each once');
  assert.equal(cp.sessionMin, 24 * 60, 'clamped to a day');
  assert.equal(cp.equipment.length, payload.PROFILE_EQUIPMENT_MAX);
  assert.equal(cp.equipment[0], 'dumbbell');
  assert.ok(cp.equipment.every(e => e.length <= payload.PROFILE_WORD_MAX));
}

test('an intake posted with megabytes of text is cut to what the intake screen allows', () => {
  const p = payload.build(sampleState(), { handle: 'h'.repeat(16), kind: 'create', intake: hugeProfile() });
  assertBounded(p.coachProfile);
  assert.ok(JSON.stringify(p).length < 100_000, 'the whole payload stays small');
});

test('a profile synced into the state is cut the same way, for a review and a debrief too', () => {
  const S = sampleState();
  S.coach.profile = hugeProfile();
  for (const kind of ['create', 'review', 'debrief']) {
    const p = payload.build(S, { handle: 'h'.repeat(16), kind });
    assertBounded(p.coachProfile);
    assert.ok(JSON.stringify(p).length < 100_000, kind + ' payload stays small');
  }
});

test('a profile of the wrong shape reads as absent instead of crashing or leaking an object', () => {
  const p = payload.build(sampleState(), {
    handle: 'h'.repeat(16), kind: 'create',
    intake: { goal: { $x: 1 }, experience: 7, daysPerWeek: 'many', preferredDays: 'mon', sessionMin: '', equipment: 'dumbbell', limitations: { a: 1 }, likes: ['x'], dislikes: 3, notes: null }
  });
  assert.deepEqual(p.coachProfile, {
    goal: null, experience: null, daysPerWeek: null, preferredDays: [], sessionMin: null,
    equipment: [], limitations: '', likes: '', dislikes: '', notes: ''
  });
  // A bare-string equipment used to reach librarySlice's .map and throw; now it is no filter.
  assert.ok(p.library.length > 0);
});

test('weekdays are read as weekdays: nothing becomes Sunday, and zero days or minutes read as unset', () => {
  const p = payload.build(sampleState(), {
    handle: 'h'.repeat(16), kind: 'create',
    intake: { goal: 'muscle', preferredDays: [null, '', false, '3', 5, 5, 7, -1, 'Sunday'], daysPerWeek: 0, sessionMin: '0' }
  });
  assert.deepEqual(p.coachProfile.preferredDays, [3, 5]);
  assert.equal(p.coachProfile.daysPerWeek, null);
  assert.equal(p.coachProfile.sessionMin, null);
});

test('a real intake passes through unchanged', () => {
  const intake = {
    goal: 'muscle', experience: 'returning', daysPerWeek: 4, preferredDays: [1, 2, 4, 5], sessionMin: 75,
    equipment: ['dumbbell', 'barbell'], limitations: 'Left shoulder clicks overhead.', likes: 'deadlifts', dislikes: 'lunges', notes: 'Arms by spring.'
  };
  const p = payload.build(sampleState(), { handle: 'h'.repeat(16), kind: 'create', intake });
  assert.deepEqual(p.coachProfile, intake);
});

test('names, the declined log and the meta codes are bounded too, since the state is the client\'s', () => {
  const S = sampleState({ lang: 'en' + HUGE, unit: 'kg' + HUGE });
  S.routines[0].name = 'Push' + HUGE;
  S.routines[0].emoji = '💪' + HUGE;
  S.workouts[0].name = 'Push' + HUGE;
  S.workouts[0].rating = 'great' + HUGE;
  S.customEx = [{ id: 'cx1', n: 'Sandbag' + HUGE, bp: 'back' + HUGE }];
  S.coach.log = [{ decisions: [{ status: 'rejected', type: 'sets' + HUGE, why: 'no' + HUGE }] }];
  for (const kind of ['create', 'review', 'debrief']) {
    const p = payload.build(S, { handle: 'h'.repeat(16), kind });
    assert.ok(JSON.stringify(p).length < 100_000, kind + ' payload stays small');
    assert.equal(p.plan.routines[0].name.length, payload.NAME_MAX);
    assert.ok(p.plan.routines[0].emoji.length <= 16);
    assert.ok(p.meta.lang.length <= 16 && p.meta.unit.length <= 8);
    assert.ok(p.previouslyDeclined[0].why.length <= 600);
    if (p.library) assert.ok(p.library[0].n.length <= payload.NAME_MAX && p.library[0].bp.length <= 40);
    const w = p.window?.workouts[0] || p.session;
    if (w) assert.ok(w.name.length <= payload.NAME_MAX && w.rating.length <= 20);
  }
});

// The server's limits are the screen's limits. If someone lengthens a field on the intake
// screen, this says the payload would now cut what the person was allowed to type.
test('the limits match the intake screen', () => {
  const src = fs.readFileSync(new URL('../../frontend/src/views/CoachIntake.jsx', import.meta.url), 'utf8');
  for (const [field, max] of Object.entries(payload.PROFILE_TEXT_MAX)) {
    const m = src.match(new RegExp('maxLength=\\{(\\d+)\\} value=\\{p\\.' + field + '\\}'));
    assert.ok(m, field + ' has a maxLength on the intake screen');
    assert.equal(Number(m[1]), max, field);
  }
});
