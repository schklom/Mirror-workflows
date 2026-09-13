# Roadmap

Where openGym is going, in the order it is likely to land. Each block is a GitHub milestone; the
issues and pull requests attached to it are the plan, this file is the readable summary. The
dates are the order, not a promise: a one-maintainer self-hosted project ships a version when the
branch has been used in a real gym for a while. Blocks are deliberately over-full — whatever is not
done when a version ships rolls into the next one. Version numbers follow the release rule, not the
size of the change: the next release is the last published one plus one patch (1.3.1 → 1.3.2), and a
minor bump is reserved for something that breaks compatibility.

- Milestones: https://github.com/DuarteSantos8/openGym/milestones — every open issue sits in exactly one
- Order: v1.3.8 the promised items and history editing → v1.3.9 programmes and progression → **v1.4.0 the
  foundation (database and search, the one compatibility break)** → v1.4.1 accounts → v1.4.2 the iOS app
  and mobile → v1.4.3 everything that those two unlock
- "In review" means: on a branch and deployed to gym-test.duarte-santos.ch, waiting for a real session.

---

## v1.3.2 and v1.3.3 — Cleaner workout  (released 2026-09-05)

**Theme: the workout screen gets out of the way.** Fewer things to tap, the things you tap every set
stay where they are, everything else moves one tap away. Compared with Hevy or Strong the screen was
busy: ~10 buttons under a card and ~8 per set. The new default is one "⋯" per exercise, the set
number as the set's own menu, and an optional list view.

Shipped: v1.3.2 is the contributors' batch, v1.3.3 the redesign and the bug round on top of it.

- Workout view: cards or a scrollable list, with the header pinned in list mode (!96, #28, #44, #50)
- One menu per exercise (note, details, progression, bar weight, warm-up, superset, swap, move,
  remove) and one per set (drop set, rest-pause burst, remove) (#20)
- Settings → During a workout → "Workout controls": +/− buttons, drop/burst shortcuts, superset
  buttons, move/swap/remove buttons — each switch brings an old button row back
- Colour-coded RIR/RPE picker with a plain-language explanation per level; the empty cell is one
  button, a logged rating is tinted by how close to failure it was (!91, #32)
- Automatic working weight, no confirmation prompt, no auto-advance (!92, #18)
- Stepper fixes: one tap = one step in supersets (!97, #41); the +/− uses the exercise's own
  increment and progression's rounding, without snapping off-grid values (!84)
- Progression: routines with progression off keep their targets everywhere (!71); a weight change
  starts a new stall streak so a deload cannot spiral (!93); the progression sheet cannot save into
  the wrong entry (!77)
- Starter plans: Push/Pull/Legs, Upper/Lower, Full Body, 5×5 with a chooser and confirmation (!94)
- Muscle explorer in the library and the exercise picker, honouring the equipment profile (!87)
- Copy routine (!85); the "+" in the exercise picker adds immediately (!72)
- Timer flash blinks the theme; no replay after the app was hidden; a quiet toast on reopen (!89)
- MCP: `preview_session` shows what a routine will really open with; `rest_sec` in `get_routine` (!90, !81, #36)
- Coach: the create schema requires routine ids and a week, and caps the arrays (!99)
- Infrastructure: nginx re-resolves the api container (#16); Renovate config repaired (#37); CI with
  JUnit/coverage, stack smoke test, Trivy scan, SBOMs, release preflight, fork-MR pipelines

Also in v1.3.3: exercise history and a progress line from the ⋯ menu (#43), favourite exercises
(#6), the in-app update check for the Android build (!40, #38, #9), the Coach save fix on Android
(#42), bands as bodyweight equipment (#39), kg ↔ lb conversion (#22), the centre tab button on the
workout screen (#29, #21), warm-up ramps on the exercise increment, and the small fixes from the
tester round.

Left over from this block:

- "By muscle" inside the Add-exercise sheet keeps the keyboard-aware search
- A real pause for the workout timers (#29 asked for it)
- Discord announcement (owner)

## v1.3.6 and v1.3.7 — Sync, push and the phone  (released 2026-09-12)

Signed in, the server's profile is the truth: sign-in adopts it, two devices merge on a server
revision instead of overwriting each other, the app polls for changes and works offline with a
banner. Reminders fire up to 15 minutes late rather than never, push subscriptions re-register
themselves, rest-timer alerts are per device. iOS: chip rows scroll sideways only, sheets clear the
Dynamic Island, the tab bar stays put after the keyboard, the home-screen app reloads offline. The
twelve Astra findings, eleven community merges (weigh-in switch, Swiss German, iOS 26 build, PDF on
the phone, nginx resolver, custom-exercise equipment, per-side data, warm-up rest) and a headless
QA sweep of every screen. Left over: routine reordering (#142), the Smith-bar "no bar" option
(#138), two decimals (#139), delete user in the admin (#107).

## v1.3.8 — Promised & history  (October 2026)

**Theme: pay the debts before building anything new.** Everything here was either promised on the
tracker with a version number, or is the single most requested thing (editing a finished workout).
Small, and every item is its own commit.

- Reorder routines in Plan; the Start sheet follows that order (#142)
- "No bar" per exercise, so Smith-machine lifts calculate plates and drop sets from 0 (#138)
- Two decimals on per-side weights, as a display toggle (#139)
- Delete a user from the admin dashboard: credentials, state file, subscriptions, Coach data (#107)
- **Edit a finished workout** — date, start time, duration, name, sets, weights, add or remove an
  exercise; progression and 1RM history re-read the corrected session (#143; GitLab !127 and !139
  as reference, Discord "edit finished workouts", "edit past workouts time", "change the date")
- Save a logged workout as a routine, repeat a past workout from History, undo finish (#111, #58,
  GitLab !130, Discord "Historic tab")
- Relabel an "Unknown" exercise after an import without losing its sets (Discord)
- Copy a workout as text for sharing or pasting into a chat (Discord "Improvement ideas")
- Custom-exercise muscle order is fixed, not click order (Discord); the import fallback classifies
  "wrist curl", "row … neutral grip" and Romanian deadlifts correctly (Discord, `bpFromName`)
- Auto-backup keeps the last N files instead of one per workout (#161, first half)
- A "next step" hotkey that does not depend on focus, for a big button on a Pi (#133)
- The small open pull requests: the unknown-path redirect (#185), the manifest behind an auth
  proxy (#184), standard ß (#190), distance in feet and the distance mode (#177, #178), body
  measurements (#82), extra passkeys and the device link (#95)

## v1.3.9 — Programmes & progression  (November 2026)

**Theme: training structure beyond one weekly template.** The contributor work is already open;
the job here is one model, then one merge at a time, each rebased and tested on gym-test.

- A free-running session queue beside the fixed week — the next session is the next undone one,
  whatever the weekday — with an in-app editor and automatic refill (#158, #69, PR #167 and the
  editor on top of it; Discord "not forced into a weekly plan", "major good ideas" 1)
- Programmes: routines grouped into a named block over weeks, with deload and rest weeks, several
  per profile (#159, GitLab !98, Discord "Programme mode", "folders")
- Session phases — mobility / work / accessory / cooldown — with completion-only exercises for
  stretching that stay out of volume and PRs (#57, #140; Discord "non-typed exercises")
- The progression engine: rep and set ranges per set, a universal AMRAP / "to failure" flag, load as
  %1RM or auto with a stored training max, target RPE/RIR, triple and wave progression (#154, #153,
  #179, #186, #70, PRs #168 and #181; Discord "Sets to Failure", "More types of sets")
- Multi-formula 1RM (#155), a warm-up generator that picks the ramp from load and lift (#156),
  assisted exercises as negative added weight (#176)
- Exercise alternatives per routine slot, and Replace in the routine editor (#110, Discord)
- Cardio: incline and intervals (rounds × work/rest), interval programmes such as C25k, rucking as
  distance + pace + load (#132, #169; Discord "incline treadmill", "cardio programs", "rucking");
  complexes and interval groups beside supersets (Discord)
- Swipe between exercise cards during a workout (#113, GitLab !114), drag-and-drop exercise order
  that survives touch (#114 — the first version came out again on 2026-09-07), the Start/Resume
  button as "next" during a workout (Discord)
- Periodisation extras once the engine is in: mesocycle blocks, auto-regulation on RPE (#120)

## v1.4.0 — Foundation: database & search  (December 2026 – January 2027)

**Theme: change the floor once.** Storage moves from one JSON file per profile to a database, and
search is rebuilt over the catalogue, custom exercises and history. This is the compatibility break
the minor bump is reserved for, so it carries nothing that does not need it. The state file stays
the import/export and backup format; the revision/merge contract from v1.3.6 stays the client
contract. The database is what makes several writers on one profile (a trainer, the MCP server, a
second app), per-location histories, shared exercises and the iOS sync honest.

- Database: tables for workouts, sets, routines, weigh-ins, custom exercises, favourites,
  credentials, push subscriptions and Coach data; idempotent migration on first start; the old files
  kept until the admin removes them; which database is decided in the issue (embedded by default so
  `docker compose up` stays one line; a server database as an option — Discord "Postgres/SQLite")
- Search: one index over catalogue names in every language, import aliases and custom exercises;
  typo tolerance (GitLab !122) and a live result count (!31); filters that compose; history search
  for the Coach and MCP; built once per catalogue version, not per keystroke
- Shared custom exercises between accounts on one instance (#151)
- Admin: per-user export, invite management, audit log filters
- "Different gyms": a location on a logged set, separate histories and PRs per location, bodyweight
  shared (Discord "How to deal with different gyms" — designed in that thread, built here)

## v1.4.1 — Accounts & integrations  (February 2027)

**Theme: who may sign in, and what else may read or write your data.** Everything here writes to
credentials or to a profile from outside the app, so it lands on the new database, not before it.

- Optional username + password login next to passkeys (#118; Discord "Basic login", the
  password-manager thread)
- OIDC login for PocketID / Authelia-style setups (#130, #72; GitLab !132 is the candidate)
- Personal-trainer role: invite students by code, open a student read-only, write their plan (#119,
  GitLab !79; Discord "Trainer & Student Management")
- MCP write tools — routines, log corrections, equipment — in pieces (#116), and remote MCP over
  OAuth for hosted AI clients (GitLab !88)
- Switching kg ↔ lb converts stored values instead of relabelling them (#22)

## v1.4.2 — iOS app & mobile  (March 2027)

**Theme: the same app on both phones, talking to the same server.** The Capacitor iOS target has
existed since the Android build; what was missing was an Apple developer account and a reason. The
database and the sync contract are the reason: an App Store app that reads the profile through the
same API as the web app, and the health integrations that a Home Screen web app cannot do.

- iOS: App Store / TestFlight build, HealthKit weight and workout export, the Home Screen icon and
  timer sound issues gone for good; Apple Watch rest timer later (#90; Discord "Google Health")
- Android: Health Connect for weight and sessions (Discord "Use health connect"), the rest timer as
  an ongoing notification on the lock screen (#122), a home-screen widget (#125), APK back under
  10 MB with ABI filters (#136), the auto-backup directory picker (#161, second half)
- Withings and other scales (#127)
- Media for the routine's exercises cached on the phone, so a session works with no signal (#123,
  Discord "Download all videos")
- Firefox-on-Windows QR and third-party passkey providers stay documented, not fixed here — they
  are platform behaviour (#103, #101)

## v1.4.3 — Exercises & more  (April 2027)

**Theme: what the foundation and the two apps unlock.** Ideas, not commitments; whatever is
wanted most when v1.4.2 ships goes first.

- Pictures for custom exercises: pick from the catalogue, then upload; a video URL per exercise
  (#126, #170; Discord "custom images/GIFs", "upload videos")
- Catalogue: bench as equipment with flat / adjustable, TRX / suspension equipment, lats and the
  three delts as their own categories, exercises that should not carry weight, more routine icons
  (#132, #188; Discord)
- Choose what the "last time" line shows on the logger (#173); one progress line per set number
  (#145); custom heatmap targets per muscle; a shareable image after a workout (Discord)
- Skins alongside the accent colour, backgrounds as part of a skin, a big-screen layout (#129,
  #134, #135)
- Social: friends, progress and plan sharing (PR #180); a plugin surface for integrations
  (Discord "plugin system")
- Native NixOS module (GitLab !83) and Azure deployment (!35) only if someone maintains them;
  Arabic and right-to-left (GitLab !36) once rebased

## How things move

An issue sits in exactly one milestone; whatever is not done when that version ships rolls into the
next one. Contributor pull requests from returning contributors get their pipeline started here
automatically; a first PR is started by hand after a look at the diff. Anything in review is on gym-test.duarte-santos.ch. Releases
bundle whatever has passed that test, with a changelog section per contributor.
