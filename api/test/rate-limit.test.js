/* The two counters behind the sign-in throttle (#118), on a clock the test walks by hand. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackoff, createWindow } from '../rate-limit.js';

const clock = () => { const c = { t: 1e12 }; c.now = () => c.t; return c; };

test('backoff: the free failures cost nothing, then each one doubles the pause up to the cap', () => {
  const c = clock();
  const b = createBackoff({ free: 3, baseMs: 1000, maxMs: 5000, forgetMs: 60000, now: c.now });
  assert.deepEqual([b.fail('k'), b.fail('k'), b.fail('k')], [0, 0, 0]);
  assert.equal(b.retryAfter('k'), 0);
  assert.equal(b.fail('k'), 1);
  assert.equal(b.retryAfter('k'), 1);
  c.t += 1000;
  assert.equal(b.retryAfter('k'), 0);
  assert.equal(b.fail('k'), 2);
  c.t += 2000;
  assert.equal(b.fail('k'), 4);
  c.t += 4000;
  assert.equal(b.fail('k'), 5, 'capped');
  assert.equal(b.retryAfter('other'), 0, 'keys are independent');
});

test('backoff: a success or a quiet spell after the pause starts the count over', () => {
  const c = clock();
  const b = createBackoff({ free: 1, baseMs: 1000, maxMs: 60000, forgetMs: 10000, now: c.now });
  b.fail('k'); assert.equal(b.fail('k'), 1);
  b.clear('k');
  assert.equal(b.fail('k'), 0);
  assert.equal(b.fail('k'), 1);
  c.t += 1000 + 10001;          // the pause, then longer than forgetMs without a failure
  assert.equal(b.fail('k'), 0);
});

test('backoff: the map stays bounded, and a locked key is the last to be evicted', () => {
  const c = clock();
  const b = createBackoff({ free: 1, baseMs: 60000, maxMs: 60000, forgetMs: 60000, maxKeys: 3, now: c.now });
  b.fail('locked'); b.fail('locked');
  assert.ok(b.retryAfter('locked') > 0);
  for (const k of ['a', 'b', 'c', 'd']) b.fail(k);   // a flood of fresh keys
  assert.equal(b.size, 3);
  assert.ok(b.retryAfter('locked') > 0, 'the lock survived the flood');
});

test('backoff: sweep drops keys that are neither locked nor recent', () => {
  const c = clock();
  const b = createBackoff({ free: 5, forgetMs: 1000, now: c.now });
  b.fail('old'); c.t += 2000; b.fail('new');
  b.sweep();
  assert.equal(b.size, 1);
});

test('window: a fixed budget per key, and how long until it refills', () => {
  const c = clock();
  const w = createWindow({ max: 2, windowMs: 10000, now: c.now });
  assert.deepEqual([w.take('k'), w.take('k')], [0, 0]);
  assert.equal(w.take('k'), 10);
  c.t += 4000;
  assert.equal(w.take('k'), 6);
  c.t += 6000;
  assert.equal(w.take('k'), 0);
  c.t += 10000; w.sweep();
  assert.equal(w.size, 0);
});
