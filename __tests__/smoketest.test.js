jest.mock('../wikiless.config', () => ({
  redis_url: 'redis://127.0.0.1:6379',
  redis_password: '',
  https_enabled: false,
  redirect_http_to_https: false,
  trust_proxy: false,
  cert_dir: '',
  domain: 'test.local',
  ssl_port: 0,
  nonssl_port: 0,
  http_addr: '127.0.0.1',
}));

const request = require('supertest');
const app = require('../src/wikiless.js');

describe('GET /health', () => {
  it('should respond with 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });
});
