# Changelog

## v1.2.9 — 2026-08-23

If you run openGym for other people, you have had no way to answer "who signed in, and when?" —
the server kept no record of anything. It does now: an **activity log** in the admin dashboard,
covering sign-ins, sign-outs, the attempts that failed, and every admin action. The other half of
this release is that **the live demo is back**, self-hosted this time, after two months offline.
And the project has a working home again: openGym now lives on **GitLab**, where CI builds the
container images and the signed Android APK for every release — the thing that has been missing
since the GitHub account went.

### Activity log

- 🧾 **The admin dashboard has an activity log.** Successful and failed sign-ins, profile
  creations and refused signups, sign-outs (including "sign out everywhere"), and every admin
  action: disabling or re-enabling an account, creating or revoking an invite code, and clearing
  the log itself. Filter it by sign-ins, admin actions or failures, and page back through it.
- 📄 **It is a plain file.** `./data/audit.log`, one JSON object per line — `tail -f` and `jq`
  read it directly, which also means it is its own export format. Deliberately *not* part of
  `db.json`: that file is rewritten in full on every save, and the sign-in handshake is
  unauthenticated, so a log living in there would have turned one junk request into a full
  rewrite. Retention is a cap rather than an archive — the last `AUDIT_MAX` events (5,000) or
  `AUDIT_DAYS` days (90), whichever runs out first.
- 🔒 **It records less than you might expect, on purpose.** No IP addresses unless you turn them
  on (`AUDIT_IP=net` keeps only the network, `full` keeps the address); never the browser's
  user-agent; and never the passkey id behind a failed sign-in, because that id is a stable handle
  for one device and storing it would let an admin follow an unknown device from one attempt to
  the next. A rejected invite code is not stored either — a near-miss guess sitting in a log file
  helps nobody.
- 🧹 **Clearing it is itself logged**, and the event ids keep counting, so an erased stretch always
  leaves a visible gap.
- ⚙️ **On by default when you update, and one variable turns it off.** It records strictly less
  than your instance already holds — every profile is in `db.json`, every workout is in
  `state-<uid>.json`, and any admin can already read both — and a log that ships switched off
  tells you nothing on the day you need it. `AUDIT_LOG=0` disables it completely; no file is
  written. Nothing leaves your server either way: this is a local file, not telemetry.
- Guests still never appear anywhere — guest mode does not talk to the server at all.

### The live demo is back

- ▶️ **<https://opengym.duarte-santos.ch/demo/>** — the in-browser demo, running on the project's
  own site instead of GitHub Pages, which went down in August with the suspended account. Same
  build as before: no backend, no account, seeded example history, and a reset button in its
  settings. The embedded demo on the landing page works again too.

### openGym moved to GitLab

- 🏠 **<https://gitlab.com/DuarteSantos8/opengym>** is the home of the project. Same history,
  same tags, same AGPL. gitea.com was the stopgap after the GitHub suspension and stays as a
  mirror; it never had a CI runner, which is why releases there had no images.
- 🐳 **Prebuilt images are back.** `docker compose pull` now fetches
  `registry.gitlab.com/duartesantos8/opengym/api` and `/web`, built for **amd64 and arm64** on
  every release. Pulling is anonymous — the project is public, no login, no token.
- 🤖 **The APK is built by CI now, not by hand.** Every `vX.Y.Z` tag produces a `zipalign`ed,
  signed APK, attached to the GitLab release and mirrored onto the download page. The signing
  key sits in protected CI variables, so it exists only on `main` and on version tags — a
  merge request from a fork builds an unsigned APK and never touches the key.
- ✅ **Every merge request is tested again.** The frontend suite (346 tests), the locale checks,
  the fatigue probe and the MCP suite all run on GitLab CI. The GitHub Actions workflows stay
  in `.github/` for the day that account comes back.
- 🌐 The in-browser demo also builds to GitLab Pages
  (<https://opengym-bc111a.gitlab.io/>, which <https://duartesantos8.gitlab.io/opengym/>
  redirects to); <https://opengym.duarte-santos.ch/demo/> remains the copy the landing page
  embeds.
- 📄 Security reports have a private channel again: a **confidential issue** on GitLab. See
  `SECURITY.md`.
- 🔁 **Dependency updates continue.** GitLab has no Dependabot, so Renovate runs from a monthly
  scheduled pipeline with the same deliberately quiet policy the Dependabot config had:
  grouped per ecosystem, majors on their own, odd-numbered Node images skipped, and the
  generated `android/`/`ios/` projects left to follow their `@capacitor/*` packages. Security
  advisories ignore the schedule and land on their own.

### Housekeeping

- The self-hosting docs, `SECURITY.md` and `.env.example` cover the activity log, and the
  `api/server.js` line references in `SECURITY.md` are accurate again.
- Every repository link in the README, the docs, the app and the website points at GitLab, and
  the website's live star/release numbers come from GitLab's API.

## v1.2.8 — 2026-08-22

A housekeeping release, and two things worth reading even if you skip the rest. openGym has moved
to **gitea.com** — the GitHub account it lived on was suspended, and everything you click to
self-host pointed there. And the exercise media's licence is now stated correctly: the images and
animations are © Gym visual, not CC, which matters if you redistribute them.

### The project moved to gitea.com

- 🏠 **openGym now lives at <https://gitea.com/DuarteSantos/openGym>.** The GitHub account
  was suspended on 2026-08-19 and took the repository, the GHCR images, the Pages demo and
  Discussions with it. `docker compose` now pulls `gitea.com/duartesantos/opengym-{api,web}`; the
  README, `SECURITY.md`, `CONTRIBUTING.md` and the self-hosting docs point at the new home; issue
  forms, tests and the image publish run as Gitea Actions. **If you self-host, re-pull:** the old
  `ghcr.io` images are gone and will not update again.
- Gitea has no Discussions, so questions and ideas are labelled issues — or the Discord, which
  is where most of it happens now: <https://discord.gg/e62jY6fwVb>.
- Old issue and PR numbers in the entries below stay as plain text. They point at a dead repo and
  do not match the numbering here.

### The exercise media is © Gym visual — not CC

- ⚖️ **openGym described the exercise dataset as "CC". That was wrong**, and it is now
  corrected everywhere it appeared (README, `NOTICE.md`, the website, the in-app credit, the
  compose file and `scripts/fetch-media.sh`). Upstream
  [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) licenses its two
  halves differently: the exercise **metadata and instruction text are MIT**, while the **images and
  animations are © [Gym visual](https://gymvisual.com/)**, used under that dataset's terms with
  permission that is not transferable.
- **Nothing changes for using openGym.** It never shipped that media — not in the repository,
  not in its history, not in the images or the APK; your instance downloads it from upstream on
  first run, and the media step now prints where it comes from and under what terms.
- **It does change what you may do with the media.** Reusing the images or animations — in
  openGym or anywhere else, commercially or not — needs your own licence from Gym visual. See
  [NOTICE.md](NOTICE.md).

### Fixes

- ⬅️ **The back gesture no longer quits the app** (Android). The packaged app never listened for
  the system back event at all — Capacitor leaves that to `@capacitor/app`, which was not
  installed — so a back swipe went straight past the WebView and finished the activity from
  wherever you were. The per-sheet history entries added in [#63] only ever did anything in a
  browser tab. Back now dismisses the open sheet, then walks back through the screens you came
  from, and only leaves the app after a second press at the root ("Press back again to exit").
  A sheet that is locked mid-task still swallows back, as it does in the browser.

### The website counts visits; the app still counts nothing

- 📊 **<https://opengym.duarte-santos.ch> now runs self-hosted, cookieless
  [Umami](https://umami.is/)** — page views for the landing, about and docs pages, no cookies,
  no third-party service.
- 🔒 **Your instance does not.** The frontend only gets an analytics tag when
  `VITE_UMAMI_SRC` *and* `VITE_UMAMI_ID` are set at build time, which they are not in any published
  image or in a plain `npm run build`. A self-hosted openGym remains telemetry-free, as advertised.

## v1.2.7 — 2026-08-18

The muscle map answers a third question. Balance showed where the volume went and Fatigue what was
still recovering; Strength now names the exercises behind a muscle and what each one is worth in
estimated 1RM. Fatigue itself got harder to fool — a set counts for more the closer it is to your
maximum, and it can no longer creep upward across a rest week. In a session, supersets finally
behave: pair them as you go, rest once per round, and drop an exercise you have decided against.

### The muscle map, read as strength

- **A per-muscle exercise breakdown** behind the muscle card — estimated 1RM per exercise, decay
  bars, and primary/secondary tags, with a best-weight fallback for holds and carries that have no
  reps to work from. Contributed by [@Space-Hermes](https://github.com/Space-Hermes) in
  [#92](https://github.com/DuarteSantos8/openGym/pull/92),
  [#93](https://github.com/DuarteSantos8/openGym/pull/93) and
  [#94](https://github.com/DuarteSantos8/openGym/pull/94).
- **Fatigue is now intensity-weighted**, not volume alone: a set counts for more the closer it is
  to your estimated maximum. It also reads against a stable historical reference, so fatigue can no
  longer *rise* across a rest week, and bodyweight movements no longer register as zero load. A
  property probe over 108,000 comparisons runs in CI to keep it that way. Contributed by
  [@Space-Hermes](https://github.com/Space-Hermes) in
  [#55](https://github.com/DuarteSantos8/openGym/pull/55).

### In a session

- 🔗 **Supersets advance properly.** Completing a set moves to the next member of the group, the
  active exercise scrolls into view, and rest starts once the whole round is done rather than after
  each set. Contributed by [@Space-Hermes](https://github.com/Space-Hermes) in
  [#80](https://github.com/DuarteSantos8/openGym/pull/80).
- ➖ **Remove an exercise from a running session**, with a superset-aware picker and a confirmation.
  Contributed by [@Space-Hermes](https://github.com/Space-Hermes) in
  [#83](https://github.com/DuarteSantos8/openGym/pull/83).
- ⬅️ **The Android back button closes the open sheet** instead of leaving the screen or the app
  ([#63]). Each open sheet gets its own history entry, so stacked sheets unwind one at a time.
  Contributed by [@Space-Hermes](https://github.com/Space-Hermes) in
  [#85](https://github.com/DuarteSantos8/openGym/pull/85).

### Self-hosting

- 🐳 **The API service no longer has to be called `api`** ([#99]). The web image builds its nginx
  config at startup from `BACKEND`, `PORT` and `NGINX_PORT`, all defaulted to today's values, so
  existing compose files are unaffected. Reported and fixed by
  [@GAS85](https://github.com/GAS85) in [#100](https://github.com/DuarteSantos8/openGym/pull/100).
- **…and the shipped `docker-compose.yml` now actually passes those through.** The `web` service
  had no environment of its own and published a hardcoded `:80`, so setting `BACKEND` or
  `NGINX_PORT` in `.env` did nothing at all on the stock stack — the setting existed, the wiring
  did not. Both services now read `PORT` from the same place, so nginx cannot end up proxying to a
  port the API is not listening on. Defaults are unchanged, so an existing `.env` behaves exactly
  as before.
- 🏷️ **Health checks and OCI image labels** on both images — source, licence, version, revision and
  build date, so image tooling can tell what it is holding. Contributed by
  [@GAS85](https://github.com/GAS85) in [#98](https://github.com/DuarteSantos8/openGym/pull/98).
- **Images are published from a release, not from any tag** ([#87]). A tag that gets consolidated
  away before it becomes a release used to leave its image tags behind in the registry, where
  dependency bots read them as newer versions.

### Fixes

- **Imported warm-up sets were counted as work.** The importer marks them with `phase`, but several
  places still read the older boolean, so warm-ups from FitNotes/Strong/Hevy history inflated set
  counts, progression and the fatigue map.

[#63]: https://github.com/DuarteSantos8/openGym/issues/63
[#87]: https://github.com/DuarteSantos8/openGym/issues/87
[#99]: https://github.com/DuarteSantos8/openGym/issues/99

## v1.2.6 — 2026-08-11

The muscle map learned to answer a second question — not just where the volume went, but what is
still recovering from it. Plus: a freestyle session no longer starts from blanks, the rest timer
can reach you in another app, and a self-hosted instance can insist that everyone using it has an
account.

### The muscle map, read as recovery (#44)

- 🔥 **A `Balance | Fatigue | Strength` switch on the Stats muscle card.** Balance is the map you
  already had and is untouched. Fatigue shades each muscle by how much of the recent training it
  is still carrying; Strength shades it by how long it has been since you trained it at all, with
  the weeks-since count spelled out underneath.
- **Fatigue is volume-sensitive and fades smoothly.** A hard twelve-set chest day starts near the
  top and takes about six days to read ready again; a single set barely registers and is gone in
  two. It decays continuously on a 36-hour half-life rather than expiring at a window edge, so the
  map never flips from "fatigued" to "ready" between one look and the next.
- **Strength holds for two weeks, then decays toward a floor.** A muscle you have not trained in
  months reads detrained rather than absent, which is the state that actually tells you something.
- Both views are pure functions over your existing history — no new stored data, no schema change,
  nothing sent anywhere.

### The rest timer can reach you in another app (#49)

- ⏰ **A system notification when rest is over**, on top of the beep, for when you have switched to
  another tab or app mid-session. Permission is asked the first time a rest starts, and everything
  degrades quietly where notifications are unsupported or refused.
- It goes through the service worker where the browser requires that — which is most phones — and
  falls back to the direct API elsewhere. No new dependencies; the existing server push path is
  untouched.

### Rows now strain the rear delts (#51)

- **Four row variations gained rear-deltoid secondaries** — barbell, dumbbell, inverted and cable
  seated rows — so the muscle map spreads their load the way the lift actually does. The overrides
  live in a small table that survives a regeneration of the exercise dataset rather than being
  edited into the generated data.

### An instance can require an account (#42)

- 🔒 **`ALLOW_GUEST=0` removes the "Continue without account" button.** Guest mode keeps everything
  in the browser and never touches the server — no account, no sync, nothing the admin dashboard
  can see — so on an instance meant for a known set of people it was a door leading nowhere
  useful, and until now there was no way to close it.
- **It also ends guest sessions that already exist.** Guests never authenticate, so there is no
  request for the server to start refusing; the switch reaches someone already inside on their
  next visit, when the app checks the config and returns them to the login screen. Their data is
  not deleted — it stays in that browser, and moves into a real profile if they create one on the
  same device.
- **A server it cannot reach is not a server that said no.** The button is only withdrawn on an
  explicit `allow_guest: false`; a failed config request, or a server too old to send the flag at
  all, leaves guest mode exactly as it was. An instance that is merely offline for a moment does
  not lock out everyone who never made an account.
- **Default is on, so nothing changes for existing instances.** Set it alongside `INVITE_ONLY=1`:
  invite-only governs who may *create a profile* and says nothing about the guest button, which
  never creates one.

### Freestyle sessions start where you left off

- 🏋️ **Adding an exercise to an empty workout now prefills it from the last time you trained
  it** — the same number of sets, with each row's reps and weight carried across by position.
  Cardio brings its duration and speed, a hold brings its seconds. Until now every row opened on
  the config-sheet defaults, so the first thing a freestyle session asked of you was to retype
  what you already did last week.
- **The config sheet agrees with the rows it is about to create.** It opens on the last target you
  actually trained rather than the generic default, so the set count you confirm is the set count
  you get.
- **Planned sessions are untouched.** A routine-driven workout still runs the progression logic and
  still applies its prescription; only the freestyle path — which has no prescription to apply —
  reads from history instead.

Contributed by [@Space-Hermes](https://github.com/Space-Hermes) in
[#50](https://github.com/DuarteSantos8/openGym/pull/50).

### Pair exercises into a superset mid-session (#64)

- 🔗 **"Make superset with previous / next" on each exercise card.** Two exercises paired in the
  session collapse into a single *Superset* card — do them back-to-back, rest once at the end —
  with an **Unpair** button in the header. No planning ahead required; pair them when you decide
  to, in the workout.
- **Groups are any size.** Pairing the end of one group to the start of another merges them, and
  the header wording stays correct past two exercises.
- **Unpairing cleans up after itself.** A group reduced to one exercise is dissolved rather than
  left as a superset of one, and the pairing helpers never mutate the running session.
- Session-only by design: pairings drive the workout, and history stores the sets.

Contributed by [@Space-Hermes](https://github.com/Space-Hermes) in
[#64](https://github.com/DuarteSantos8/openGym/pull/64).

### The muscle map stops rewriting the catalogue (#67)

- **The curated secondary-muscle additions are now an overlay, not a mutation.** The four row
  exercises that strain the rear delts used to get that written into the shared exercise dataset
  at import time, which meant export, print and import saw a catalogue that had been edited
  underneath them. They are derived at the read points instead, so the dataset stays pristine.
- The detail sheet's tag row reads through the same overlay, so those muscles still show where
  they always did.

Contributed by [@Space-Hermes](https://github.com/Space-Hermes) in
[#67](https://github.com/DuarteSantos8/openGym/pull/67).

### Fixes

- 🖼️ **Exercise images and animations were blank on the routine screen** ([#79]). The media paths
  were relative, and `/plan/r/:id` is the app's only two-segment route — so the browser asked for
  `/plan/r/img/…` and got a 404 with nothing in the console to say why. Every other screen was
  fine, which is what made it look like a one-screen mystery. Reported with the root cause already
  found, by [@lemi1000](https://github.com/lemi1000).
- 📥 **Imports mapped more of what other apps export** ([#74]). Treadmill, Goblet Squat, Cycling and
  Cable Core Pallof Press arrived as *custom* exercises rather than catalogue ones — no word
  overlap could reach the names openGym stores them under. Those and their neighbours are now in
  the alias table. Already-imported history stays custom; new imports resolve. Reported by
  [@KiloOscarSix](https://github.com/KiloOscarSix).
- **A progression edge case that could loop forever** ([#60]). An entry left with nothing but
  warm-up rows seeded the set-growth loop from a warm-up, which could never satisfy its own exit
  condition. It leaves the entry alone instead. Contributed by
  [@Space-Hermes](https://github.com/Space-Hermes).
- Documented that `VITE_IMG_BASE` / `VITE_GIF_BASE` are build-time values, so setting them next to
  `docker compose` does nothing on a prebuilt image.

[#79]: https://github.com/DuarteSantos8/openGym/issues/79
[#74]: https://github.com/DuarteSantos8/openGym/issues/74
[#60]: https://github.com/DuarteSantos8/openGym/pull/60

## v1.2.5 — 2026-08-04

Nothing in the app itself changed. This release adds an optional side door: a small server that
lets an AI assistant you already run — Claude Desktop, Cursor, Cline — answer questions about
your own training, off the same files your instance already writes. If you don't use one, this
release is invisible to you.

### Ask an AI about your training, without the data leaving your box (#19)

- 🤖 **An MCP server (`mcp/`)** — opt-in, read-only, and not part of the Docker build. Your LLM
  client spawns it as a local process, it reads `./data` directly, and it exits when the client
  disconnects. No new container, no extra auth on the api, no third-party service, nothing over
  the network. *"What did I bench last week?", "what's my estimated 1RM on deadlift?", "which
  muscles have I been neglecting?"*
- **The answers match the Stats screen because they are the same numbers.** The server calls the
  very functions in `frontend/src/lib/` the app already computes with, rather than reimplementing
  them. Eight tools: routines, the week plan, workouts, one session in detail, body weight,
  estimated 1RM and muscle balance.
- **Read-only on purpose.** Logging a workout from an assistant needs a long-lived token the api
  does not have yet, plus a lock against the web UI's read-modify-write. Until both exist, the
  server answers questions and does nothing else. It never reads passkey material, VAPID keys or
  session state — only the profile it was pointed at.
- `docker-compose.yml` is untouched and nothing new enters the image, so an instance that ignores
  this ships exactly what it shipped before. Setup is in [mcp/README.md](mcp/README.md).

### Under the hood

- The pure half of `i18n.js` — the language state, the constants, the readers — moved into
  `i18n-core.js`, so the helpers under `frontend/src/lib/` can be loaded by a plain Node process
  and not only by Vite. `i18n.js` keeps the Vite-only parts (the locale-pack loader, the React
  hook) and re-exports the rest, so nothing that imports it had to change.
- The shared lib modules that only need `t` now take it from the core directly. A Vite-only
  import inside a shared module is invisible under vitest, which transforms it, and fatal to the
  MCP server, which does not — so the shared half stays clear of the bundler half by
  construction rather than by remembering to.
- `npm run check:node-loadable` in `mcp/` walks the server's import graph under a bare `node`,
  which is the one thing the test suite cannot do from inside Vite. CI runs it, alongside the
  MCP tests — neither had ever run there before.

The MCP server was contributed by [@Pengboi](https://github.com/Pengboi) — the first feature in
openGym written by someone other than me. Thank you.

## v1.2.4 — 2026-08-01

The effort ratings you have been recording since v1.2.3 now answer questions, and bodyweight
training stops being treated as barbell training with the weight left at zero. Plus: creating a
profile from Settings works on an invite-only instance, which it never has.

### The effort ratings, read back as statistics

v1.2.3 let you rate how hard a set was. Nothing then read that rating back — it lived in the set
label and nowhere else. Stats now answers the question the number was recorded for.

- 📊 **An Effort card in Stats** over 30d / 90d / 1Y / all time: average effort, the share of sets
  taken close to failure, and — always alongside them — how much of your training was rated at
  all. Rating is optional and off by default, so a partly rated history is normal; an average
  without its denominator would quietly speak for sets you never rated.
- **Week by week.** The weekly average with that week's set count in the tooltip, because the
  pair is the reading: volume up with effort up is fatigue accumulating, volume up with effort
  flat is the adaptation you were training for. Weeks resting on a single rated set are dropped
  rather than drawn.
- **Where the sets land.** The spread across the scale, not just the middle of it. Half your sets
  at failure and half in warm-up territory average out to a healthy-looking number; this is the
  chart that shows it.
- 🔥 **Hard-sets mode on the muscle map.** The same body diagram, counting only sets taken near
  failure — "where did the stimulus go" rather than "where did the volume go". A muscle can lead
  on set count and still never be trained hard.
- **Effort on the exercise curve.** Each session's dot on the top-set chart fills in as less is
  left in the tank, so the same weight moved with more in reserve stops reading as a flat line.
  Exercises with enough ratings also get an Effort curve of their own.
- **One history, whichever scale you use.** Everything aggregates internally in RIR and converts
  back for display, so a history that mixes your own RIR logs with imported RPE averages as one
  series instead of two half-empty ones. RIR charts count downward on the axis, so harder sets
  sit higher.
- Translated into all 12 UI languages.

### Bodyweight training, logged the way it is done

A push-up has no weight to type, and the app asked for one anyway — every set, on a quarter of
the catalogue. Three reports (#31, #32, #33) turned out to be the same gap: the app assumed
progress lived in the load. It doesn't, for the exercises most people actually start with.

- 💪 **Exercises know they are bodyweight.** Seeded from the equipment the dataset already
  records, so push-ups, pull-ups, dips and 300-odd others arrive marked. The weight column is
  not shown, the set row is one stepper instead of two, and the "confirm your working weight"
  prompt at the end of an exercise stops asking about a weight that was never there. (#32)
- **Added weight when there is any.** A dip belt or a weighted vest is entered once in the
  exercise settings and reads as an addition — "+10 × 8", not "10×8" — everywhere it is shown
  back. With load on the belt the normal progression rules take over again, because now there
  is something to add.
- 📈 **Reps and sets are the progression.** Clean session, one more rep. Set a top of the range
  and reaching it adds a set and starts the reps over instead of climbing forever; at six sets
  it says what it should have said all along, which is that it is time for weight or a harder
  variation. No ceiling set keeps the old behaviour exactly. (#33)
- ↔️ **Reps per side.** For lunges, single-arm rows and every other unilateral movement. You
  log what you did — 16, the total — and the app shows the split, "8 per side", so the set in
  front of you is unambiguous without the rep count meaning one thing here and another there.
  The target steps in twos, 16 → 18 → 20, because half of an odd total is a rep one side never
  gets. (#31)
- Both settings travel with a shared plan, and are written to a plan file only when they
  disagree with the catalogue — every existing plan, workout and backup is read unchanged and
  none of it needs migrating.
- Translated into all 12 UI languages.

### Fixed

- **Creating a profile from Settings on an invite-only instance.** The sign-in screen asks for
  the invite code when the server needs one; the same registration reached from Settings never
  did, so it was refused with nothing on screen explaining why. It now asks on the same terms.
- **A long value no longer runs through its own label** in a settings row — "Follow the routine
  (Linear progression)" overlapped "Rule" rather than shortening itself.

## v1.2.3 — 2026-07-31

How hard a set was, in whichever of the two scales you already think in — and the ratings your
old app recorded come across with the rest of your history. Plus: the phone stops locking itself
mid-workout, the rest timer can hand time back as well as take it, and Settings is grouped by
what each thing actually affects.

### The screen stays on while you train

- ☀️ **Keep screen awake — Settings → *During a workout*, on by default.** Locking, unlocking
  and finding your place again between every set was the single most annoying thing about
  logging on a phone. The screen now stays lit for as long as a workout is running and lets go
  the moment you finish it, so nothing is held while you are not training.
- **It survives a tab switch.** Browsers release the lock whenever the page stops being visible,
  which is exactly what happens when you glance at a message. The lock is taken again each time
  the app comes back, rather than dying the first time you look away.
- **It follows the workout, not the screen you are on.** Checking Stats mid-session keeps the
  screen awake.
- **Where it isn't available, it says so.** iOS grants no wake lock in Low Power Mode, and older
  browsers have no Wake Lock API at all — the first is silent, the second shows the row disabled
  rather than offering a switch that does nothing. Needs HTTPS, like every other modern browser
  capability.

### Rest timer: take 15 seconds off, too

- ⏳ **A −15s button next to +15s.** The timer could only ever be extended or skipped outright;
  now it goes both ways. Taking off more than is left finishes the rest rather than counting
  into the negative — the same thing Skip does.
- **Rearranged so three controls fit.** The clock and the progress bar take the top row and the
  controls sit underneath: −15 and +15 together in number-line order, Skip pushed to the far
  edge so the button that ends the rest is not next to the one you tap to buy more time. On a
  wide screen it stays on one line. Tap targets are bigger than they were.
- **The bar is nearly opaque.** The set rows underneath were reading through it and making the
  clock hard to pick out.

### Settings, grouped by what it affects

- **General** (language, units) · **During a workout** (rest timer, keep screen awake, sounds,
  effort per set) · **Notifications** · **Appearance** (theme, body diagram, accent) · **Data**.
- The old grouping mixed axes: "Units & timer" put a display preference next to two workout
  behaviours, language sat under Appearance, and *Load starter plan* was buried between the
  backup actions and the destructive reset. Data now reads in the order you would use it — fill
  the plan, bring history over from another app, restore a backup, export one, wipe everything.
- Nothing was removed and no setting changed its meaning.

### Effort per set: RIR or RPE (#21)

- 🎯 **A third column on a working set, off by default.** Settings → *Effort per set* switches
  it between **Off**, **RIR** and **RPE**. It only appears on weighted rep sets: a plank or a
  treadmill row has nowhere to put it.
- **Two names for the same judgement.** RIR counts the reps you left in the tank; RPE reads the
  same effort off a 10-point scale, so RPE ≈ 10 − RIR. The setting has an (i) that lays the two
  scales side by side in a conversion table rather than explaining them in a paragraph.
- **Each set keeps the scale it was logged with.** Switching the setting changes what new sets
  ask for and nothing else — history is never silently rewritten, and a set logged as RIR 2
  still reads back as RIR 2 years later.
- **An unrated set stays unrated.** Blank and 0 are different things: RIR 0 says the set went to
  failure. So `−` on an untouched cell leaves it empty, `+` starts at the bottom of the scale
  and walks up in even steps, and stepping back off the bottom clears the cell again — a mistap
  is always undoable.
- **Nothing else reads the value.** Progression rules and estimated 1RM are unaffected; the
  rating is yours to look at, not an input to the maths.
- Upgrading keeps the column you had: a profile still carrying the old `showRir` flag — from
  this device, a sync, or a backup restored later — comes across as RIR.

### Import brings your ratings with it

- 📥 **The RPE Hevy and Strong export is no longer dropped.** An `RPE` column is read into the
  set, as is an `RIR` column if a file has one, and the import summary says how many sets
  arrived with a rating — plus where to switch the column on if it's off.
- A blank cell stays unrated rather than becoming 0. A written-out `0` counts as a rating on the
  RIR scale (a set to failure) but not on RPE, which starts at 1 — apps write 0 there to mean
  "nothing here", and reading it as an effort would stamp one on every unrated set in the file.
- Ratings above the scale are capped instead of thrown away, and junk in the column is ignored
  without losing the set.
- Backups already carried both fields and the setting, since a backup is the whole state — there
  are now tests pinning that, so it can't quietly stop being true.

## v1.2.2 — 2026-07-25

Training that moves on its own: an exercise can now be logged by time instead of reps, the
next weight follows a progression rule you choose rather than a single hard-coded hint, and
every lift carries an estimated 1RM. Plus a standalone mobile app, a shareable plan, and an
importer for your history from other apps.

### Timed sets and a timer for the set itself (#16)

- ⏱️ **Reps or time, per exercise.** Planks, hangs, wall sits, dead hangs and loaded
  carries no longer have to be filed under cardio to be timed. Each exercise in a routine
  picks its own mode, and a timed set can still carry weight for a weighted plank or a
  farmer's walk.
- ▶️ **A work timer, separate from the rest timer.** Start a timed set and it counts the
  hold down, beeping and buzzing at zero exactly as the rest timer does, then checks the
  set off itself. The two timers can never run at once — they mean opposite things.
- Finishing a hold early logs **the time you actually held**, not the target. A 38-second
  hold against a 45-second target is recorded as 38 seconds.
- The mode travels everywhere it should: routine editor, workout, history, exercise
  statistics (timed exercises chart their longest hold), the printable plan and the shared
  plan file.
- Plans made before this release are read exactly as they always were — nothing to migrate.

### Progression rules you can read (#17)

- 📈 **Pick a rule per routine, override it per exercise.** Linear progression, **Greyskull
  LP** (two straight sets plus an AMRAP final set, with double jumps and a 10 % reset),
  double progression through a rep range, or adding time for timed work. Or none at all.
- 🧾 **Every target explains itself.** "Every rep last time — 2.5 kg more." "Missed reps
  3 sessions running — reset to 55 kg and work back up." The rule is visible before you
  train, not after.
- The session opens with the right weights already in the rows, instead of suggesting them
  once you are standing at the bar.
- 🚫 **A bad session can't look like a good one.** Short reps count as a miss even when you
  checked the set off; a set you never checked counts as a miss because you did not do it.
  Nothing advances the load on a session that fell apart.
- Stalls and deloads are worked out from your log every time they are needed. Nothing is
  written back into a finished workout and no counters are stored, so fixing a mistyped set
  immediately produces the right next target.
- Lower-body lifts step up in larger jumps than upper-body ones by default, and any
  exercise can set its own step.
- Bodyweight exercises progress in **reps**, because there is no load to add to a push-up
  and no load to take off it either.

### Estimated 1RM (#18)

- 💪 **An estimated one-rep max for every lift**, in the exercise progress card (with its
  own curve you can switch to) and in the exercise detail sheet.
- It always names the set it came from — "from 90 kg × 5 on 15 Jul" — because an estimate
  off a heavy triple and one off a set of ten are very different claims.
- 🧮 **A calculator** for a set you have not done yet, so the number is reachable before
  there is any history.
- Epley by default, and it **refuses to guess above 12 reps**, where the common formulas
  disagree by double digits.
- A new best estimate is reported at the end of a workout separately from a weight PR —
  same weight for more reps is real progress, but it is not a heavier lift.

### Share a plan

- 📤 **Send someone your plan.** Plan → *Share your plan* writes a small file with your
  routines, the week schedule and any custom exercises they use — and nothing else. No
  workouts, no weigh-ins, no settings.
- Importing **merges**: shared routines arrive as new ones with fresh ids, custom exercises
  are matched by name so they are not duplicated, and your own plan is never overwritten.
  Taking the week schedule with it is optional.
- 🖨️ **A printable plan** (Save as PDF) laid out so a single exercise never breaks across
  a page.

### Fixes

- A shared plan file naming an exercise this build doesn't have can no longer take the app
  down. Unknown ids are dropped on import, anything that slips through renders as a
  placeholder you can delete, and an error boundary around the screens means a bad state is
  recoverable by switching tabs instead of reloading.
- Importing from another app converts weights **per row**, not per file. FitNotes writes the
  unit on each set, so a mixed export used to land 185 lb as 185 kg.
- Numbers follow the UI language instead of a hardcoded locale, which was putting Swiss
  apostrophes ("7'535 kg") in front of everyone. Volume stays in your own unit rather than
  switching to tonnes, which was wrong for pound profiles.
- Taking over a week schedule from a shared plan now really replaces Monday–Sunday instead
  of only the days the shared file happened to fill.
- The body-weight slider's ceiling follows your unit (300 kg / 660 lb).
- "Best: 85 Kg" is capitalised correctly again.

### One codebase, two flavors

openGym is also a standalone mobile app — and it ships as a direct APK download, not
through app stores.

- 📱 **Standalone mobile app.** The same frontend now also builds as a native iPhone /
  Android app (Capacitor) — the install-and-done flavor of openGym: no account, no server,
  no sync. Everything stays on the phone.
  - State is mirrored into a file in the app's private storage on every change, so your
    log survives even when the OS evicts WebView storage (iOS does).
  - The workout-day reminder becomes a **native notification** scheduled on the weekdays
    your plan actually has a routine — no push server involved.
  - Backups go out through the OS **share sheet** (Files, AirDrop, mail…).
  - Exercise images/animations load from the same CDN as the live demo.
  - `npm run build:mobile`, then open `android/` in Android Studio or `ios/` in Xcode —
    see **docs/MOBILE.md**. `NOTICE.md` now carries an AGPL §7 app-store exception.
- 🤖 **Android APK, no Play Store.** The official build is a signed, sideloadable APK
  (~4.5 MB) from [opengym.duarte-santos.ch](https://opengym.duarte-santos.ch) — deliberately
  store-free. docs/MOBILE.md covers building and signing your own.
- 🍎 **iOS reality check.** Apple permits no installs outside the App Store, so there is no
  iOS download; the docs explain the free options (self-hosted PWA on the home screen, or
  running the native app onto your own iPhone from Xcode).

- 📥 **Import your history from another app.** Settings → Data → *Import from another app*
  reads an export from **FitNotes** (both the Android and the FitNotes 2 iOS format),
  **Strong** and **Hevy**, and pulls body-weight history out of an **Apple Health** export.
  Anything else with a date, an exercise name and weight/reps columns is read too.
  - Every row becomes a set, grouped into workouts by date, so your history arrives with
    its real dates rather than as one lump. Hevy and Strong also carry session length, so
    the activity heatmap fills in properly.
  - Exercise names are matched against the 1,324-exercise library — parenthetical
    qualifiers like "(Barbell)" and shorthand like BB/DB are normalised, and a curated
    table covers the plain names people actually log ("Bench Press", "Squat", "RDL").
    Where a name is genuinely ambiguous it is *not* guessed at: it becomes one of your own
    exercises instead, because filing years of training under the wrong lift is worse than
    an unmatched name you can see and fix.
  - A summary shows what will happen — workouts, sets, how many exercises matched, which
    ones didn't, and whether weights need converting — before anything is written.
  - Importing is idempotent: days you already have data for are left alone, so running it
    twice, or importing from two apps, never duplicates a workout.

## v1.2.1 — 2026-07-23

A muscle map across the app, and a live demo you can try without installing anything.

- 💪 **Muscle map.** Three places now show which muscles your training actually reaches, drawn on a
  front-and-back body diagram shaded like the activity heatmap — more accent means more work.
  - **Stats → Muscle balance** aggregates a week, 30 days, 90 days or everything, lists your
    hardest-worked muscles with their set counts, and names the ones that got *nothing* in that
    period. That last list is the point of the card: the gaps are what you'd otherwise never notice.
    Tap any muscle to read its name and volume.
  - **Routine editor** previews what a session hits as you build it, so a hole in the plan shows up
    before you train around it for a month.
  - **The finish screen** shows what you just trained.
  - Load is counted in *effective sets* — a set counts fully for the exercise's target muscle and
    partially for its supporting ones — not in kilograms, because 100 kg of leg press and 12 kg of
    lateral raise say nothing about which muscle worked harder. Shading is relative within the
    period you're looking at, so the map always reads as a balance rather than an absolute.
  - Settings → Appearance → **Body diagram** switches between a male and female figure.
  - The exercise dataset spells muscles inconsistently ("delts", "deltoids" and "shoulders" are one
    muscle); all 50 spellings it uses are normalised onto the 18 the diagram can draw. Custom
    exercises, which only carry a body part, fall back to it. The geometry is ~90 kB and loads on
    demand, so the initial bundle is unchanged.
- 🐛 **Fixed: finishing a workout from its last exercise could blank the whole app.** The
  per-exercise weight sheet read the running workout without checking it was still there, and
  finishing clears it while that sheet is still on screen.
- ▶️ **Live demo** at [duartesantos8.github.io/openGym](https://duartesantos8.github.io/openGym/) —
  a browser-only build (`VITE_DEMO=1`) published to GitHub Pages on every push to `main`. It boots
  into guest mode with a seeded example profile (12 weeks of Push/Pull/Legs, weigh-ins, PRs) so
  every screen has something to show, and it never talks to a server. Passkeys, sync and the admin
  dashboard stay exclusive to self-hosted instances, which is where the backend lives.
- 🖼️ Builds can point the exercise media elsewhere via `VITE_IMG_BASE` / `VITE_GIF_BASE` — the demo
  serves the ~140 MB dataset from a CDN instead of shipping it. The default (`img/` and `gif/` next
  to the app) is unchanged.

## v1.2.0 — 2026-07-23

A complete visual redesign. Same app, same data — every screen redrawn.

### A designed interface, not an assembled one

- 🎨 **Rebuilt design system.** One type scale carrying hierarchy through size instead of making
  everything bold, a neutral surface ramp instead of saturated blue-greys, hairline separators
  instead of outlined boxes, and motion that acknowledges a press rather than animating for
  decoration. Light and dark are both first-class, and the eight accent colours now pick their
  label colour by measured contrast — the default green in light mode was failing WCAG AA on
  every primary button before.
- ✏️ **A hand-drawn icon set** (77 icons, single stroke weight, drawn on one 24×24 grid) replaces
  every emoji in the interface. Emoji render differently on each platform, sit on their own
  baseline and can't take a theme colour, which is what made the old UI feel stitched together.
  Icons inherit the surrounding text colour and optical size.
- 🏋️ **Routine icons.** Picking an icon for a routine now offers a grouped set — strength,
  equipment, cardio, recovery — instead of an emoji keyboard. Routines you already made keep
  their look: the old emoji are mapped forward automatically, so nothing to migrate and nothing
  to redo.
- ▶️ **New tab bar** with a raised Start button that turns into a pulsing orange Resume while a
  workout is running.
- 🏠 **Home reads as a plan for today** — week strip, today's session as one tappable row, body
  weight, and your streak.

### Charts

- 📈 **Axis labels, gridlines and the target-weight line are visible again** in dark mode. They
  were painted with colour variables that no longer existed, which silently fell back to black
  on black — and to no stroke at all for the lines.
- 💬 **The hover readout stays on screen.** It used to be positioned with a fixed offset that
  assumed one label width, so the first and last point pushed it under the chart's clip; it's now
  placed from its measured size and kept inside the frame, dropping below the point when the
  point sits high enough that the label would cover the value it reports.
- 🖱️ **It also goes away again** — moving off the chart now clears the readout, crosshair and
  marker, which previously stayed until you hovered somewhere else.

## v1.1.3 — 2026-07-22

Admin dashboard for self-hosters (opt-in — off by default), equipment filtering, and
workout-screen fixes.

### Admin dashboard

- 🛠️ **Admin dashboard** (Settings → Admin dashboard) for whoever runs the instance: a users
  overview with workout counts and last-active times, plus a per-user drill-down into their full
  workout history and body-weight log.
- 🟢 **Live "training now"** — see who's mid-workout in real time, with their current exercise and
  set progress, updated by a lightweight heartbeat while a workout is on screen.
- 🚫 **Disable / enable accounts** — a disabled account is signed out and locked out everywhere
  until you re-enable it.
- 🔑 **Invite-only signup** (optional) — require an invite code to create a profile; generate and
  revoke codes from the dashboard. Existing accounts are unaffected.
- ⚙️ Configured via environment: `ADMIN_UIDS` (comma-separated user ids who are admins) and
  `INVITE_ONLY=1`; both default off, so a fresh instance stays open with no admin. See
  `.env.example`. Admin access is gated by your passkey and enforced server-side.

### Exercises & workout

- 🏋️ **Filter exercises by equipment** (#6). A second filter row under the body parts lets you
  narrow the list to what you actually have — body weight, dumbbell, barbell, cable, band, and so
  on — in both the Exercises library and the exercise picker. The options adapt to what you've
  already selected and are ordered by how many exercises use them, so every combination on screen
  has results behind it and the row stays short. Building a bodyweight-only plan is now two taps
  per body part.
- 🔎 **Minimize the exercise animation during a workout** (#12). A ⤡ Minimize / ⤢ Expand button
  on the animation shrinks it to a thin strip so the set rows sit right under your thumb — no more
  scrolling past a big GIF to tick off a set. Your choice is remembered and applied to every
  exercise and future workout until you change it, so you set it once. Tapping the animation still
  pauses/plays it as before.
- ⏱️ **Fixed: the rest timer froze at 0:01** (#14) instead of counting down to the end. It also
  meant the timer could only be cleared with Skip, and a redundant "rest over" push notification
  could still fire.

## v1.1.2 — 2026-07-22

Custom exercises, full localization, and input fixes.

### Custom exercises (#11)

- ✨ **Create your own exercise** from the exercise picker or the Exercises tab: a name and a
  body part is all it takes. Your search text is pre-filled as the name, so "no match" flows
  straight into "create it".
- 📝 **Optional description** — setup, cues, anything you want to remember. It shows on the
  exercise's detail and config sheets (where a built-in exercise would show its animation),
  and it's searchable, so you can find your own exercises by their cues too.
- 🏋️ Custom exercises behave like built-in ones everywhere — routines, supersets, workout
  logging, weight suggestions, PRs, stats and history. The animation stays blank by design.
- 🏃 Pick the *cardio* body part and it logs time + speed instead of weight × reps, like the
  built-in cardio exercises.
- ✏️ Edit (rename, change body part or description) or delete your custom exercises — from
  their detail sheet in the Exercises tab, or straight from the exercise inside a routine via
  "Edit or delete this exercise". Deleting removes them from your routines; already-logged
  workouts keep their sets and still show the exercise name. (The routine sheet's old "Remove
  exercise" button is now labelled "Remove from routine", so the two are no longer confusable.)

### Localization (#7)

- 🌍 **12 UI languages**: English, Deutsch, Español, Français, Italiano, Português, Polski,
  Türkçe, Русский, 中文, 한국어, हिन्दी. Pick yours under Settings → Appearance → Language;
  the choice syncs with your profile like the theme does.
- 📖 **Localized exercise instructions** for 10 of those languages (all except German and
  Portuguese, which the upstream dataset doesn't cover yet — those fall back to English),
  covering all 1,324 exercises. Body-part filters, equipment and muscle tags are translated
  too; exercise *names* stay English (upstream limitation). Custom exercises are translated too.
- 📅 Dates, weekday and month labels follow the selected language.
- ⚡ Zero cost when unused: the app still ships English-only by default. Each UI language is a
  ~7 kB chunk and each instruction pack ~80–120 kB (gzipped), downloaded only when you switch —
  the initial bundle size is unchanged.
- 🛠️ New `scripts/build-instructions.mjs` regenerates the instruction packs from the upstream
  dataset; translations live in `frontend/src/locales/` (PRs welcome — it's one flat
  English-string → translation map per language).
- Known gaps: push notification texts (sent by the server) and plural forms in some languages
  are approximated; happy to take corrections from native speakers.

### Fixes

- ⌨️ Weight and other numeric fields now accept a comma as decimal separator ("33,5") — iOS
  decimal keyboards in many locales only offer a comma, which previously reset the field to 0.
  Partial input like "33," no longer snaps to 0 while typing. (#13)
- 📱 Fixed the exercise-config sheet (Sets / Reps / Weight, and the cardio variant) overflowing the
  screen edge on narrow phones — the Weight stepper was clipped and could make the whole page pan
  sideways in iOS Safari. Steppers now shrink to fit the viewport. (#10)
- 🛡️ Added a global horizontal-overflow guard so a single too-wide element can no longer knock the
  page layout off-scale.

## v1.1.1 — 2026-07-21

Reliability fixes for the push notifications shipped in v1.1.0, found through live testing:

- 🌍 Workout day reminder now fires by each user's own browser-detected timezone instead of a
  single server-wide one — works correctly regardless of where the server runs, and follows you
  automatically if you travel.
- 💾 Settings changes (like the reminder time) are flushed to the server immediately when the tab
  backgrounds or closes, instead of relying solely on a 1.5s debounce that could get cut short.
- ⏱️ Reminder check tightened from a 60s to a 10s interval, and pushes are now marked
  `urgency: 'high'` — cuts avoidable delay on top of it, though delivery time is ultimately up to
  Apple/Google's push relay.
- 🪵 Push send failures are now logged instead of silently swallowed.

## v1.1.0 — 2026-07-21

- 🐳 Prebuilt Docker images published to `ghcr.io/duartesantos8/opengym-{api,web}` (amd64 + arm64)
  via GitHub Actions, so self-hosting no longer requires building from source. `docker compose pull`
  grabs them; `docker compose up -d --build` still builds locally if you'd rather.
- 🔔 Push notifications: rest-timer-over alert (fires even if the app is closed) and an optional
  daily reminder on days you have a workout planned but haven't logged one yet. Opt in per-profile
  in Settings — requires a signed-in passkey profile. Backend gains one dependency (`web-push`);
  VAPID keys are generated on first run.
- 🐛 Fixed the rest timer stalling when the tab/app is backgrounded — it's now anchored to a real
  timestamp instead of a plain per-second counter, so it stays accurate after you come back.

## v1.0.0 — 2026-07-20

First public release. A complete, self-hostable gym & body-weight tracker.

**Highlights**
- ⚖️ Body-weight tracking with an interactive chart + goal line
- 🏋️ Weekly routine planner over 1,324 exercises with animated demos
- ▶️ Guided workouts: body-weight check-in, pre-filled weights, rest timer, PR detection, per-exercise weight tracking
- 🔗 Supersets and 🏃 cardio (time + speed) logging
- 🗓️ Per-day rescheduling without touching your weekly plan
- 🟩 GitHub-style activity heatmap (by time trained)
- 🔑 Passkey (WebAuthn) login with per-profile data that syncs across devices
- 🎨 Light/dark themes + 8 accent colors, synced to your profile
- 📦 JSON export/import, guest mode, PWA install, no telemetry

**Stack**
- React 19 + Vite (React Router, Zustand)
- Node backend, no framework, single dependency (`@simplewebauthn/server`), JSON-file storage
- nginx + multi-stage Docker so `docker compose up` builds and serves everything

**Notes**
- Exercise media (~140 MB) is fetched from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) on first run.
- Licensed under GNU AGPL v3.0.
