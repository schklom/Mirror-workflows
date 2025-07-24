jest.mock('../wikiless.config', () => ({
  default_lang: 'en',
  wikimedia_useragent: 'test-agent',
  domain: 'test.example.org',
  setexs: { wikipage: 3600 },
}));

const path = require('path');
const Utils = require('../src/utils.js');

describe('Utils factory', () => {
  let fakeRedis, utils;

  beforeAll(() => {
    fakeRedis = {
      get:    jest.fn().mockResolvedValue(null),
      setEx:  jest.fn().mockResolvedValue('OK'),
      isOpen: false,
      connect: jest.fn().mockResolvedValue(),
    };
    utils = new Utils(fakeRedis);
  });

  test('download(): missing URL returns proper error', async () => {
    const result = await utils.download('');
    expect(result).toEqual({ success: false, reason: 'MISSING_URL' });
  });

  test('validHtml() recognizes real HTML', () => {
    expect(utils.validHtml('<div>hi</div>')).toBe(true);
    expect(utils.validHtml('')).toBe(false);
    expect(utils.validHtml(null)).toBe(false);
  });

  test('validLang() returns true/false or list', () => {
    expect(utils.validLang('en')).toBe(true);
    expect(utils.validLang('invalid')).toBe(false);
    expect(Array.isArray(utils.validLang('', true))).toBe(true);
  });

  test('wikilessLogo() & wikilessFavicon() point into static/', () => {
    const logo    = utils.wikilessLogo();
    const favicon = utils.wikilessFavicon();
    expect(logo).toContain(path.join('static', 'wikiless-logo.png'));
    expect(favicon).toContain(path.join('static', 'wikiless-favicon.ico'));
  });

  test('getLang() picks query -> cookie -> default', () => {
    expect(utils.getLang()).toBe('en');
    expect(utils.getLang({ query: { lang: 'FR' }, cookies: {} })).toBe('fr');
    expect(utils.getLang({ cookies: { default_lang: 'de' } })).toBe('de');
  });

  test('applyUserMods() injects the right stylesheet tag', () => {
    const html = '<head><meta></head><body/></body>';
    const light = utils.applyUserMods(html, 'white', 'en');
    expect(light).toContain(`href="/wikipedia_styles_light.css"`);

    const dark = utils.applyUserMods(html, 'dark', 'en');
    expect(dark).toContain(`wikipedia_styles_dark.css`);
  });
});

