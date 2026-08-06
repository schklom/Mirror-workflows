/* Provider adapters. Everything above this layer speaks one interface:
 *
 *   check(cfg, env)                                  → { ok, version?, error? }
 *   invoke({ prompt, jobDir, env, model, timeoutMs }) → { code, text, stderr, timedOut, spawnError }
 *
 * Adding a provider is a file here plus a row in config.PROVIDERS. Nothing else in the
 * codebase — routes, jobs, payload, validation, UI — knows which one is configured.
 */
import { run } from './spawn.js';
import claude from './claude.js';

/**
 * The in-repo fake provider. Ships with the image on purpose: it is what CI drives, and it
 * lets an instance owner see the entire Coach loop — intake, proposal, apply, revert —
 * before deciding whether to connect a real account to it.
 */
const FIXTURE = new URL('../fixture-cli.mjs', import.meta.url).pathname;
const fixture = {
  id: 'fixture',
  cli: process.execPath,
  async check() { return { ok: true, version: 'fixture' }; },
  async invoke({ prompt, jobDir, env, timeoutMs }) {
    const r = await run(process.execPath, [FIXTURE], {
      stdin: prompt, cwd: jobDir, timeoutMs,
      // The fixture needs its mode knob, which the sanitised job env deliberately drops.
      env: { ...env, FIXTURE_MODE: process.env.FIXTURE_MODE || '' },
      asCoach: false   // a temp dir owned by root in tests; the fixture reads only stdin anyway
    });
    return { ...r, text: (r.stdout || '').trim() };
  }
};

/* claude is registered unconditionally, and that is safe because claude.js imports the SDK
   lazily: on the default image the module loads, check() reports the runtime as absent, and
   isConnected() keeps the Coach out of /api/config entirely. Codex arrives with 6/6. */
const ADAPTERS = { fixture, claude };
export const adapterFor = provider => ADAPTERS[provider] || null;
export default ADAPTERS;
