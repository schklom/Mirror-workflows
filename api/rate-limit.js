/* In-memory throttling for the routes anyone can call without a session (#118).
 *
 * Until password sign-in there was nothing here worth guessing: a passkey assertion cannot be
 * brute-forced, invite codes are 64 random bits and pairing codes live five minutes. A password
 * is the first secret a person chooses, so the API now has to say no after enough wrong answers
 * instead of leaving that to whatever proxy the self-hoster did or did not put in front.
 *
 * Two shapes, both small enough to read in one sitting:
 *
 *   backoff  counts failures per key (an address, an account name). The first `free` cost
 *            nothing; every one after that locks the key for `baseMs`, doubling each time up
 *            to `maxMs`. A key forgets after `forgetMs` without a failure, or when the caller
 *            reports a success. This is what stands between an attacker and a password.
 *   window   counts every request per key in a fixed window — a plain budget, so one address
 *            cannot make the server mint challenges or run scrypt as fast as it can send.
 *
 * Both live in a Map that never grows past `maxKeys`: a key that is not locked and has gone
 * quiet is swept every minute, and when the Map is full anyway the oldest unlocked key makes
 * room first. Evicting a *locked* key would hand an attacker a way to reset their own lockout
 * by flooding fresh keys, so those go last. Everything is lost on a restart, which is the
 * accepted cost of not having a store — a restart is loud, and the lockouts are minutes long.
 *
 * `now` is injectable so the tests can walk the clock instead of sleeping. */

const MINUTE = 60000;

function boundedMap(maxKeys, isLocked) {
  const m = new Map();
  return {
    get: k => m.get(k),
    // Re-inserted on every touch, so iteration order is least recently used first.
    set(k, v) {
      m.delete(k);
      if (m.size >= maxKeys) {
        let victim = null;
        for (const [key, e] of m) { if (!isLocked(e)) { victim = key; break; } }
        m.delete(victim ?? m.keys().next().value);
      }
      m.set(k, v);
    },
    delete: k => m.delete(k),
    entries: () => m.entries(),
    get size() { return m.size; }
  };
}

export function createBackoff({ free = 5, baseMs = MINUTE, maxMs = 60 * MINUTE, forgetMs = 24 * 60 * MINUTE, maxKeys = 10000, now = Date.now } = {}) {
  const locked = e => e.until > now();
  const map = boundedMap(maxKeys, locked);
  const fresh = e => e && now() - Math.max(e.last, e.until) <= forgetMs;
  return {
    /** Seconds the key still has to wait, 0 when it may try. */
    retryAfter(key) {
      const e = map.get(key);
      return e && locked(e) ? Math.ceil((e.until - now()) / 1000) : 0;
    },
    /** One more failure. Returns the lock in seconds this failure caused, 0 for none. */
    fail(key) {
      const prev = map.get(key);
      const e = fresh(prev) ? prev : { n: 0, until: 0, last: 0 };
      e.n += 1;
      e.last = now();
      let lock = 0;
      if (e.n > free) {
        lock = Math.min(maxMs, baseMs * 2 ** Math.min(30, e.n - free - 1));
        e.until = e.last + lock;
      }
      map.set(key, e);
      return Math.ceil(lock / 1000);
    },
    /** A success: the key starts over. */
    clear(key) { map.delete(key); },
    sweep() {
      for (const [k, e] of map.entries()) if (!locked(e) && !fresh(e)) map.delete(k);
    },
    get size() { return map.size; }
  };
}

export function createWindow({ max = 60, windowMs = MINUTE, maxKeys = 10000, now = Date.now } = {}) {
  const over = e => e.count > max && now() - e.start < windowMs;
  const map = boundedMap(maxKeys, over);
  return {
    /** Counts this request. Returns 0 when it is within budget, else seconds to wait. */
    take(key) {
      let e = map.get(key);
      if (!e || now() - e.start >= windowMs) e = { start: now(), count: 0 };
      e.count += 1;
      map.set(key, e);
      return e.count > max ? Math.max(1, Math.ceil((e.start + windowMs - now()) / 1000)) : 0;
    },
    sweep() {
      for (const [k, e] of map.entries()) if (now() - e.start >= windowMs) map.delete(k);
    },
    get size() { return map.size; }
  };
}
