/* The admin routes, driven with fake server helpers — the layer between the card and the
 * config store, which learned per-provider keys, a base URL, a model list and the "this
 * provider spawns nothing" report. The user routes are exercised through jobs.test.js. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { tempData } from './helpers.mjs';

tempData();
const cfg = await import('../coach/config.js');
const { coachRoutes } = await import('../coach/routes.js');

// The four helpers server.js hands in, as fakes: an admin is always signed in here.
function harness() {
  const out = {};
  const routes = coachRoutes({
    json: (res, status, body) => { res.status = status; res.body = body; },
    readBody: async req => req.body || {},
    readSession: () => ({ id: 'admin-1', admin: true }),
    requireAdmin: () => true
  });
  const call = async (key, body) => { const res = {}; await routes[key]({ body }, res); return res; };
  out.call = call; out.routes = routes;
  return out;
}

/** A local endpoint speaking the OpenAI list shape, so no test ever reaches the internet. */
async function mockEndpoint(models = ['llama3', 'gemma']) {
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/v1/models') return res.end(JSON.stringify({ data: models.map(id => ({ id })) }));
    res.statusCode = 404; res.end('{}');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

test('the admin card is told which providers hold a key, and switching never drops one', async () => {
  const mock = await mockEndpoint();
  try {
    cfg.reset(); cfg.save({ enabled: true, provider: 'fixture' });
    const { call } = harness();

    // The active provider is the local endpoint; keys for two cloud providers are filed while
    // they are NOT active — the chips can be prepared ahead of switching.
    let r = await call('POST /api/admin/coach/config', { provider: 'compatible', baseUrl: mock.base });
    assert.equal(r.status, 200);
    r = await call('POST /api/admin/coach/connect', { type: 'apikey', token: 'k-compat', account: 'lan' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    r = await call('POST /api/admin/coach/connect', { provider: 'anthropic', type: 'apikey', token: 'sk-ant-x', account: 'me' });
    assert.equal(r.status, 200);
    r = await call('POST /api/admin/coach/connect', { provider: 'openai', type: 'apikey', token: 'sk-oa-x' });
    assert.equal(r.status, 200);

    r = await call('GET /api/admin/coach');
    assert.equal(r.status, 200);
    const byId = Object.fromEntries(r.body.providers.map(p => [p.id, p]));
    assert.equal(byId.compatible.connected, true);
    assert.equal(byId.anthropic.connected, true);
    assert.equal(byId.openai.connected, true);
    assert.equal(byId.gemini.connected, false);
    assert.equal(byId.compatible.keyOptional, true);
    assert.equal(byId.compatible.baseUrl, true);
    assert.equal(byId.claude.setupToken, true);
    assert.equal(byId.openai.http, true);
    assert.equal(byId.openai.defaultModel, 'gpt-5.6');
    assert.equal(r.body.auth.state, 'connected');
    assert.equal(r.body.auth.type, 'apikey');
    assert.equal(r.body.auth.account, 'lan');
    assert.ok(r.body.auth.connectedAt);
    assert.equal(r.body.model, null, 'a compatible endpoint has no default model');
    assert.deepEqual(r.body.unprivileged, { ok: true, dropped: false, why: 'this provider runs no child process' });
    assert.equal(r.body.runtime.ok, true, r.body.runtime.error);
    assert.match(r.body.runtime.version, /2 models/);
    assert.deepEqual(r.body.knownModels, ['gemma', 'llama3']);
    assert.ok(!JSON.stringify(r.body).includes('sk-') && !JSON.stringify(r.body).includes('k-compat'), 'no key ever comes back');

    // Each provider keeps its own model; switching away and back loses nothing.
    await call('POST /api/admin/coach/config', { model: 'llama3' });
    await call('POST /api/admin/coach/config', { provider: 'openai', model: 'gpt-x' });
    await call('POST /api/admin/coach/config', { provider: 'anthropic' });
    assert.equal(cfg.modelFor(), 'claude-opus-5', 'anthropic falls back to its default');
    assert.equal(cfg.modelFor(cfg.load(), 'openai'), 'gpt-x');
    assert.equal(cfg.credentialFor('alice').auth.token, 'sk-ant-x');
    await call('POST /api/admin/coach/config', { provider: 'compatible' });
    r = await call('GET /api/admin/coach');
    assert.equal(r.body.auth.state, 'connected');
    assert.equal(r.body.model, 'llama3');
    assert.equal(r.body.models.openai, 'gpt-x');

    // Disconnecting one provider leaves the others alone.
    r = await call('POST /api/admin/coach/disconnect', { provider: 'openai' });
    assert.equal(r.status, 200);
    r = await call('GET /api/admin/coach');
    assert.equal(r.body.auth.state, 'connected', 'the active provider is still connected');
    assert.equal(r.body.providers.find(p => p.id === 'openai').connected, false);
    assert.equal(r.body.providers.find(p => p.id === 'anthropic').connected, true);
  } finally { mock.close(); }
});

test('a key filed for a provider that does not take one, or an unknown provider, is refused', async () => {
  cfg.reset(); cfg.save({ enabled: true, provider: 'fixture' });
  const { call } = harness();
  let r = await call('POST /api/admin/coach/connect', { type: 'apikey', token: 'x' });
  assert.equal(r.status, 400);
  r = await call('POST /api/admin/coach/connect', { provider: 'nope', type: 'apikey', token: 'x' });
  assert.equal(r.status, 400);
  r = await call('POST /api/admin/coach/connect', { provider: 'openai', type: 'cli-token', token: 'x' });
  assert.equal(r.status, 400, 'openai has no oauth variable');
  r = await call('POST /api/admin/coach/config', { provider: 'openai', baseUrl: 'http://x' });
  assert.equal(r.status, 400, 'openai has a fixed endpoint');
});

test('the compatible endpoint: base URL is validated, a keyless endpoint counts as connected, and models come from it', async () => {
  const mock = await mockEndpoint();
  const base = mock.base;
  try {
    cfg.reset(); cfg.save({ enabled: true, provider: 'fixture' });
    const { call } = harness();
    let r = await call('POST /api/admin/coach/config', { provider: 'compatible', baseUrl: 'http://user:pw@x' });
    assert.equal(r.status, 400);
    r = await call('POST /api/admin/coach/config', { provider: 'compatible', baseUrl: base + '/' });
    assert.equal(r.status, 200);

    r = await call('GET /api/admin/coach');
    assert.equal(r.body.baseUrl, base);
    assert.equal(r.body.auth.state, 'optional');
    assert.equal(r.body.runtime.ok, true);
    assert.deepEqual(r.body.knownModels, ['gemma', 'llama3'], 'the status call already listed them');
    assert.equal(cfg.isConnected(), true);
    assert.equal(cfg.publicConfig().provider, 'compatible', 'the Coach is offered to users');

    r = await call('POST /api/admin/coach/models', {});
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.models, ['gemma', 'llama3']);

    r = await call('POST /api/admin/coach/config', { model: 'llama3' });
    assert.equal(cfg.modelFor(), 'llama3');
  } finally { mock.close(); }
});

test('the disclosure names the provider and the same five categories the payload builds from', async () => {
  cfg.reset(); cfg.save({ enabled: true, provider: 'gemini' });
  const { call } = harness();
  const r = await call('GET /api/coach/disclosure');
  assert.equal(r.status, 200);
  assert.equal(r.body.providerLabel, 'Google Gemini');
  assert.deepEqual(r.body.categories, ['plan', 'training', 'bodyweight', 'profile', 'prefs']);
});
