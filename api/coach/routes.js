/* HTTP surface for the Coach — user routes and admin routes.
 *
 * Written as a factory taking server.js's own helpers rather than importing them: the helpers
 * are closures over the db and the session secret, and passing them in keeps this module free
 * of a cycle (and trivially testable against fakes).
 */
import * as cfgStore from './config.js';
import * as jobs from './jobs.js';
import { adapterFor } from './adapters/index.js';
import { canDropPrivileges } from './adapters/spawn.js';
import { DATA_CATEGORIES } from './core/payload.js';

// Job failures the user sees, in the app's own voice. The raw provider detail never reaches
// them — it goes to the admin card, which is where someone can act on it (FR-47).
const USER_ERROR = {
  off: 'the Coach is not set up on this instance',
  busy: 'the Coach is already thinking about your training',
  cap: 'the Coach is resting — try again tomorrow',
  consent: 'the Coach needs your go-ahead first',
  // Verbatim, because it tells the user the one thing that resolves it and names who resolves
  // it. A vaguer message here turns into a support question for the person running the box.
  shared: cfgStore.SHARED_ACCOUNT_REFUSAL,
  unprivileged: 'the Coach is switched off on this instance for safety reasons'
};
const HTTP_FOR = { off: 503, busy: 409, cap: 429, consent: 403, shared: 409, unprivileged: 503 };

export function coachRoutes({ json, readBody, readSession, requireAdmin }) {
  /** Every user route starts the same way: signed in, feature on, feature reachable. */
  const guard = (req, res) => {
    const user = readSession(req);
    if (!user) { json(res, 401, { error: 'not signed in' }); return null; }
    if (!cfgStore.isEnabled() || !cfgStore.isConnected()) { json(res, 503, { error: USER_ERROR.off }); return null; }
    return user;
  };
  const failEnqueue = (res, e) => {
    if (e instanceof jobs.CoachError) return json(res, HTTP_FOR[e.code] || 400, { error: USER_ERROR[e.code] || e.message, code: e.code });
    throw e;
  };

  return {
    /* ------------------------------ user ------------------------------ */

    // What the consent screen has to disclose, straight from the module that builds payloads,
    // so the screen cannot drift from what actually leaves (FR-09). Signed in only: the screen
    // that reads it sits behind a session anyway, and on an invite-only instance which provider
    // this box is wired to is nobody's business who has not been let in.
    'GET /api/coach/disclosure': async (req, res) => {
      if (!readSession(req)) return json(res, 401, { error: 'not signed in' });
      const cfg = cfgStore.load();
      json(res, 200, {
        provider: cfg.provider,
        providerLabel: cfgStore.providerMeta(cfg).label,
        categories: DATA_CATEGORIES,
        version: 1
      });
    },

    'GET /api/coach/status': async (req, res) => {
      const user = guard(req, res); if (!user) return;
      json(res, 200, jobs.status(user.id));
    },

    'POST /api/coach/plan': async (req, res) => {
      const user = guard(req, res); if (!user) return;
      const body = await readBody(req);
      try {
        const job = jobs.enqueue(user.id, {
          kind: 'create',
          intake: body.intake || null,
          refine: body.refine ? String(body.refine).slice(0, 1000) : null
        });
        json(res, 202, { job });
      } catch (e) { failEnqueue(res, e); }
    },

    'POST /api/coach/review': async (req, res) => {
      const user = guard(req, res); if (!user) return;
      const body = await readBody(req);
      try {
        const job = jobs.enqueue(user.id, { kind: 'review', note: body.note ? String(body.note).slice(0, 1000) : null });
        json(res, 202, { job });
      } catch (e) { failEnqueue(res, e); }
    },

    'POST /api/coach/pending/resolve': async (req, res) => {
      const user = guard(req, res); if (!user) return;
      const body = await readBody(req);
      json(res, 200, jobs.resolvePending(user.id, {
        accepted: Array.isArray(body.accepted) ? body.accepted : [],
        rejected: Array.isArray(body.rejected) ? body.rejected : [],
        dismissed: !!body.dismissed
      }));
    },

    // Consent withdrawn, or the profile turned the Coach off: drop everything held server-side
    // for them at once, without waiting for a sync to carry the news (D5).
    'POST /api/coach/forget': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      jobs.clearUser(user.id);
      json(res, 200, { ok: true });
    },

    /* ------------------------------ admin ------------------------------ */

    'GET /api/admin/coach': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const cfg = cfgStore.load();
      const adapter = adapterFor(cfg.provider);
      const check = adapter ? await adapter.check(cfg, cfgStore.jobEnv(process.env.TMPDIR || '/tmp')) : { ok: false, error: 'unknown provider' };
      const log = cfg.log || [];
      const today = new Date().toISOString().slice(0, 10);
      json(res, 200, {
        disabledByEnv: cfgStore.COACH_DISABLED,
        enabled: !!cfg.enabled,
        provider: cfg.provider,
        providers: Object.entries(cfgStore.PROVIDERS).map(([id, p]) => ({ id, label: p.label, runtime: p.runtime, setupToken: !!p.setupToken, deviceLogin: !!p.deviceLogin, apiKey: !!p.apiKeyEnv })),
        model: cfg.model,
        caps: cfg.caps,
        runtime: { ok: !!check.ok, version: check.version || null, error: check.error || null },
        authMode: cfg.authMode,
        boundUid: cfg.boundUid || null,
        /* Whether a credential is filed, and whose — never the credential. `unreadable` is its
           own state rather than "not connected" because it has a specific cause and a specific
           fix: ./data was restored without its `secret`, so the blob is intact and undecryptable,
           and connecting again is the way out. */
        auth: (() => {
          if (!cfgStore.providerMeta(cfg).oauthEnv && !cfgStore.providerMeta(cfg).apiKeyEnv) {
            return { state: 'not-required' };
          }
          if (!cfg.auth || !cfg.auth.data) return { state: 'none' };
          if (!cfgStore.decrypt(cfg.auth.data)) return { state: 'unreadable' };
          return { state: 'connected', type: cfg.auth.type || null, account: cfg.auth.account || null };
        })(),
        // Whether the privilege drop can actually be performed. Surfaced because the control
        // now fails closed: if this reads false, no job runs, and the admin needs to know that
        // from the card rather than from a user reporting that nothing happens.
        unprivileged: canDropPrivileges(),
        // Counts and outcomes only — never intake answers, payloads or proposals (FR-12/A4).
        jobsToday: log.filter(e => (e.at || '').slice(0, 10) === today).length,
        lastSuccess: cfgStore.lastSuccess(),
        lastError: cfgStore.lastError(),
        recent: log.slice(-20).reverse().map(e => ({ at: e.at, kind: e.kind, trigger: e.trigger, outcome: e.outcome, errorClass: e.errorClass, ms: e.ms }))
      });
    },

    'POST /api/admin/coach/config': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const patch = {};
      if (body.enabled !== undefined) patch.enabled = !!body.enabled;
      if (body.provider !== undefined) {
        if (!cfgStore.PROVIDERS[body.provider]) return json(res, 400, { error: 'unknown provider' });
        // Credentials belong to the provider that issued them.
        if (body.provider !== cfgStore.load().provider) patch.auth = null;
        patch.provider = body.provider;
      }
      if (body.model !== undefined) patch.model = body.model ? String(body.model).slice(0, 80) : null;
      if (body.caps) {
        patch.caps = {
          perProfileDaily: Math.max(0, Math.min(200, +body.caps.perProfileDaily || 0)),
          instanceDaily: Math.max(0, Math.min(5000, +body.caps.instanceDaily || 0))
        };
      }
      cfgStore.save(patch);
      json(res, 200, { ok: true });
    },

    'POST /api/admin/coach/test': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const r = await jobs.testRun();
      json(res, 200, r);
    },

    /* Connect the instance credential. Deferred while the fixture was the only provider — it
       has none, so there was nothing to connect. The real providers give it something to hold,
       which is the condition this route was waiting on.

       The token is accepted once and never read back: it is encrypted here and leaves again
       only as an environment variable on a job's child process. `type` has to match a variable
       the configured provider actually declares, so a Codex key cannot be filed under Claude
       and then silently go nowhere at job time. */
    'POST /api/admin/coach/connect': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const cfg = cfgStore.load();
      const meta = cfgStore.providerMeta(cfg);
      const type = String(body.type || '');
      const envVar = (type === 'cli-token' || type === 'oauth') ? meta.oauthEnv
        : type === 'apikey' ? meta.apiKeyEnv : null;
      if (!envVar) {
        return json(res, 400, { error: `${cfg.provider} does not take a credential of type "${type}"` });
      }
      const token = String(body.token || '').trim();
      if (!token) return json(res, 400, { error: 'no token supplied' });
      // boundUid resets with the credential: a new account has not been spent by anyone yet.
      cfgStore.save({
        auth: { type, account: String(body.account || '').slice(0, 120), data: cfgStore.encrypt({ token }) },
        boundUid: null
      });
      json(res, 200, { ok: true });
    },

    'POST /api/admin/coach/disconnect': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      cfgStore.save({ auth: null, boundUid: null });
      json(res, 200, { ok: true });
    },

    /* Still absent: `authMode`, and with it the per-profile credential routes. Instance mode is
       the whole of what these two routes serve, and per-profile needs its own connect/clear pair
       against saveProfileAuth/clearProfileAuth — a switch with nothing on the other side is worse
       than no switch, so it waits for the PR that builds that side. */

    /* Whose account this profile is about to spend. Its own route because both the Coach screen
       and the admin card must state it, and neither should be inferring it from settings. */
    'GET /api/coach/account': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      json(res, 200, cfgStore.accountFor(user.id));
    }
  };
}
