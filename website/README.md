# opengym.duarte-santos.ch

Source of the project website — plain hand-written HTML/CSS/JS, no build step,
served by nginx.

Not in this folder (added at deploy time):

- `img/` — the five screenshots from `../assets/screenshots/` plus `banner.png`
- `icon-180.png` / `icon-512.png` — copied from `../frontend/public/` (the same
  icons the PWA uses, so the browser tab, home screen and app all match)
- `openGym.apk` — the signed release build (see `../docs/MOBILE.md`)
- `demo/` — the browser-only demo build of the app, embedded in the `#demo` section and
  reachable on its own at `/demo/`. Built from `../frontend` with `VITE_DEMO=1` and the
  jsDelivr media bases (see the `pages` job in `../.gitlab-ci.yml`), so the ~140 MB
  of exercise media stays out of it. It has to live on this host: the site frames it, and
  `X-Frame-Options: SAMEORIGIN` would block it from anywhere else.

`site.js` fetches the star/issue counts and the release timeline from the public
gitlab.com API at view time. It pointed at api.github.com until that account was
suspended; the two URLs go back once it is restored, together with the notice
block at the top of `index.html` and the demo iframe.
