const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Mock config
jest.mock('../wikiless.config', () => ({ theme: 'auto', default_lang: 'en' }));

// Stub utils and inject global handlers
jest.mock('../src/utils.js', () => {
  return function() {
    return {
      handleWikiPage: jest.fn((req, res, prefix) => res.status(200).send(`HANDLED_${prefix}`)),
      proxyMedia:     jest.fn(async () => ({ success: true, path: 'DUMMY_PATH' })),
      preferencesPage:jest.fn(() => '<html>PREFERENCES</html>'),
      customLogos:    jest.fn(() => false),
      wikilessLogo:   jest.fn(() => 'LOGO_PATH'),
      wikilessFavicon:jest.fn(() => 'FAVICON_PATH'),
    };
  };
});

// Load utils and assign global functions expected by routes.js
const utilsFactory = require('../src/utils.js');
const utils = utilsFactory();
global.handleWikiPage   = utils.handleWikiPage;
global.proxyMedia       = utils.proxyMedia;
global.preferencesPage  = utils.preferencesPage;
global.customLogos      = utils.customLogos;
global.wikilessLogo     = utils.wikilessLogo;
global.wikilessFavicon = utils.wikilessFavicon;

// Load and mount routes
const routes = require('../src/routes');
let app;
beforeEach(() => {
  app = express();
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Stub sendFile to avoid FS I/O
  app.use((req, res, next) => {
    res.sendFile = (filePath) => res.status(200).send(`SENDFILE:${filePath}`);
    next();
  });

  routes(app, utils);
});

describe('Routes wiring', () => {
  it('GET /about -> sendFile about.html', async () => {
    const res = await request(app).get('/about');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/SENDFILE:.*about\.html$/);
  });

  it('GET /static/favicon/wikipedia.ico -> sendFile favicon', async () => {
    const res = await request(app).get('/static/favicon/wikipedia.ico');
    expect(res.status).toBe(200);
    expect(res.text).toBe('SENDFILE:FAVICON_PATH');
    expect(utils.wikilessFavicon).toHaveBeenCalled();
  });

  it('GET /w/index.php?search=Foo&lang=de -> redirect', async () => {
    const res = await request(app).get('/w/index.php?search=Foo&lang=de');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/wiki/Foo?lang=de');
  });

  it('POST /preferences -> set cookies + redirect', async () => {
    const res = await request(app)
      .post('/preferences?back=/xyz')
      .send('theme=dark&default_lang=fr');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/xyz');
    const ck = res.headers['set-cookie'].join(' ');
    expect(ck).toMatch(/theme=dark/);
    expect(ck).toMatch(/default_lang=fr/);
  });

  it('GET /preferences -> render preferences page', async () => {
    const res = await request(app).get('/preferences');
    expect(res.status).toBe(200);
    expect(res.text).toBe('<html>PREFERENCES</html>');
    expect(utils.preferencesPage).toHaveBeenCalled();
  });

  it('GET /wiki/:page -> handleWikiPage', async () => {
    const res = await request(app).get('/wiki/SomePage');
    expect(res.status).toBe(200);
    expect(res.text).toBe('HANDLED_/wiki/');
    expect(utils.handleWikiPage).toHaveBeenCalledWith(
      expect.any(Object), expect.any(Object), '/wiki/'
    );
  });

  it('GET /w/:file -> handleWikiPage with /w/', async () => {
    const res = await request(app).get('/w/file.png');
    expect(res.status).toBe(200);
    expect(res.text).toBe('HANDLED_/w/');
    expect(utils.handleWikiPage).toHaveBeenCalledWith(
      expect.any(Object), expect.any(Object), '/w/'
    );
  });
});

