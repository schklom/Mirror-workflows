# The AI Coach

An optional AI that **designs** a training plan and **revises it from what you actually log**,
running on your own server under your own provider account, off until an admin turns it on.

> This document grows with the feature, which lands across a sequence of PRs. Anything described
> here that has not reached your instance yet is visibly absent rather than broken — the Coach
> only appears at all once an admin has enabled it and a runtime can be reached.

---

## Turning it on

Nothing here is an environment variable or a restart — the whole point of the admin card is that
enabling the Coach is a decision you make in the app.

**1. Build the image that has an AI runtime in it.** The default image deliberately has none:

```bash
API_TARGET=coach docker compose up -d --build api
```

`--build` matters. With a prebuilt `image:` also set, compose would otherwise pull the default.

**2. Get a credential.** On a trusted machine where you already use Claude Code:

```bash
claude setup-token
```

Complete its normal browser sign-in and copy the token it prints. openGym never opens or handles
that flow — it only ever receives the finished token.

**3. Connect it.** In the app: **Settings → Admin → AI Coach**.

- Toggle the card on.
- Pick the **Claude (Anthropic)** provider chip.
- **Add CLI token** → paste the token, and optionally label whose account it is (that label is
  what both the admin card and each user's Coach screen show when they name the account).
- **Test the Coach** — a real round trip through the provider with no user data anywhere near it.
  It reports the runtime version on success, and the provider's own error on failure.

The card also states two things worth reading before anyone uses it: whether jobs actually run
unprivileged, and which account is being spent.

**4. Use it.** Each person opens **Plan → AI Coach**, agrees to the consent screen — which lists
exactly what leaves the server, generated from the same module that builds payloads — and then
either has a plan built from a short intake or asks for a review of what they have logged.

> **On a multi-profile instance, read [Whose account pays](#whose-account-pays) first.** In the
> default instance mode the credential binds to the first profile that spends it and **every
> other profile is refused**, by design. That is the right behaviour when one person's personal
> subscription is behind it — but on a shared box it means one user gets the Coach and the rest
> get a refusal until per-profile sign-in exists.

## Whose account pays

This is the first thing to settle, because it decides what the rest of the feature is allowed
to be. The Coach spends a real provider account, and there are two shapes:

| Mode | Credential | For |
| --- | --- | --- |
| **instance** | one account, stored encrypted in `coach.json` | the single-profile instance most people run |
| **profile** | one account per profile, in its own `coach-auth-<uid>.json` | anything with more than one profile |

In instance mode the credential **binds to the first profile that spends it**. Any other profile
is refused:

> This instance is configured with a single shared account — ask your admin to enable
> per-profile sign-in.

No job runs. That is a refusal, not a warning, on purpose — a warning moves the decision onto
whoever clicks past it, and the decision is about spending somebody else's personal
subscription. It is the same posture the payload allowlist takes.

**The instance owner is responsible for their provider's terms.** openGym does not interpret
them on a self-hoster's behalf; it makes the shape that doesn't need the interpretation
available, and refuses the shape that does.

A profile credential lives in its own file, `0600`, never in `state-<uid>.json` — profile state
syncs across devices and travels in the user's JSON export, and a credential that rides along in
a backup is the same class of mistake as a token inside the directory the README tells you to
archive.

## What actually leaves your server

`api/coach/payload.js` is built as an allowlist: every field is copied in **by name**, nothing
is spread and nothing is passed through, so a field added to the state blob next year cannot
ride along by accident. The five categories it can send — the same list the consent screen
renders from, so the screen cannot drift from the payload — are:

| Category | What it covers |
| --- | --- |
| `plan` | routines, exercises, sets/reps, schedule, progression settings |
| `training` | logged sets, targets, effort ratings, durations, PRs in the review window |
| `bodyweight` | weigh-ins in the window and your goal weight |
| `profile` | the intake answers you gave the Coach, including any limitations |
| `prefs` | unit, language, effort scale |

A review reads a training block, not a training career: the window is capped at **12 weeks or 60
sessions**. Your profile is identified by a stable pseudonym that is never the user id and never
reversible.

Excluded on purpose and permanently: **display name and user id, passkey and credential
material, push subscriptions, invite data, theme and appearance settings, and every other
profile's everything.**

## Bodyweight and per-side work

Upstream v1.2.4 taught the app that a push-up carries no load and a lunge is logged as a total
across both sides. The Coach has to know the same things, because on a bodyweight exercise
`weight` means *added* load and is `0` on a perfectly good session — so every load-shaped signal
reads flat. A Coach that couldn't see this would look at a working push-up progression and
propose adding weight to a push-up.

So the payload carries `bodyweight`, `side` and `repsMax`, the session reader carries the set
count (the dimension bodyweight work grows once reps hit their ceiling), and the prompts say
that reps and then sets are the progression, and that per-side targets step in twos.

The server re-implements three reading rules the frontend owns — `modeOf`, `isBw`, `isPerSide` —
because the api image has no build step in common with the frontend. `coach-parity.test.js`
pins them against the originals over a table of configs, so the copies cannot drift silently.

## What comes back, and what it is allowed to do

The prompt asks for a shape and the model usually obliges. `api/coach/validate.js` is where
"usually" stops mattering, and it — not the prompt — is the security boundary. Nothing reaches
you that has not:

- **matched the closed list of change types.** Eighteen of them, each with an apply
  implementation on the client to match. A hostile note in your own free text can talk a model
  into saying anything at all; it cannot invent a change type, and a change type that is not on
  the list does nothing. There is no default case anywhere.
- **resolved against the real exercise library.** An id nobody has invalidates the whole
  proposal rather than being quietly dropped into a plan that renders blank the first time you
  train it.
- **hit something that exists.** Every target names a routine in your plan, and anything about
  an exercise names one that is actually in that routine.
- **cited its evidence.** A change with no `why` is refused.

A rejected answer gets **one** repair round, with the errors handed back verbatim. Two failures
is a provider problem rather than a prompting problem, and a retry loop against a paid account
is a bad way to find that out.

The Coach may only touch **routines and the week**. Your training log, your weigh-ins and your
settings are not reachable from any change type that exists.

Applying happens **on the client**, not the server — ordinary local editing, so it works
offline, syncs like everything else, and stays reversible without the server knowing. Every
apply takes a snapshot of `{routines, week}` first, so one tap puts the plan back; workouts are
deliberately untouched by a revert, because the log is what happened. A change-set is
all-or-nothing: a failure part-way through discards the whole draft rather than leaving a
half-applied proposal.

Proposals carry a fingerprint of the plan they were computed against. If the plan has moved
since — you edited it on another device, or changed by hand the exact thing a change is
about — that change is shown greyed out with the reason, and cannot be applied. Silently
overwriting an edit you made yourself would be the worse failure.

## Isolation

Jobs run as an unprivileged `coach` user that cannot read the files holding secrets, with an
environment built from nothing rather than filtered from the parent — no `RP_ID`, no
`ADMIN_UIDS`, no VAPID material.

That privilege drop **fails closed**: on Linux, if it cannot be performed, no job is enqueued
and the admin card says so. It used to fail open — it only engaged when the server ran as root,
so adding an ordinary `USER` line to the Dockerfile, for unrelated hardening reasons, would have
quietly left the runtime inheriting the server's uid. A control that switches itself off during
somebody else's refactor is one you find out about late.

The secrets are locked file by file — `secret`, `db.json`, `coach.json` at `0600` — rather than
by sealing `./data` with a blanket `0700`. The directory is a host bind mount and the container
runs as root, so sealing it lands on the host as root-owned and unreadable, and anything else
the owner runs against their own data directory gets `EACCES`.

## You only carry the AI runtime if you ask for it

`api/Dockerfile` builds two targets from one file:

- **`default`** — what every instance has always had. `npm ci --omit=optional` skips the Agent
  SDK and its platform runtime entirely, so an owner who never wanted the Coach ships none of it.
  Around 158 MB.
- **`coach`** — the same image plus `@anthropic-ai/claude-agent-sdk`. Around 455 MB.

```
docker build --target coach ./api          # or:
API_TARGET=coach docker compose up --build api
```

The SDK sits in `optionalDependencies`, and its runtime ships as a per-platform package — this
base is Alpine, so the lockfile resolves `linux-x64-musl` / `linux-arm64-musl`. That resolution
is the sort of thing that only fails on somebody else's machine, so CI builds **and runs** both
targets: the default one has to boot and serve `/api/config` with the SDK genuinely unimportable,
and the coach one has to report a runnable SDK through the same `check()` the admin card renders.

An absent runtime is an ordinary state, not a crash: the adapter imports the SDK lazily, `check()`
says it is missing, `isConnected()` goes false, and `/api/config` carries no `coach` key at all.

Both targets create the unprivileged `coach` user. That is not a Claude-specific detail — the
privilege drop fails closed, so without that user *every* job is refused, including the fixture
provider that exists precisely so the loop can be walked before an account is connected.

## What the model is allowed to do

The Claude provider runs through the Agent SDK rather than a hand-rolled CLI call, because the
SDK exposes the switches that matter and brings its own matching runtime. Four of them are the
reason it can be trusted next to your `./data`:

| Option | Effect |
| --- | --- |
| `tools: []` | Disables **all** built-in tools — no Read, no Bash, no Grep. The model has no filesystem tool at all, however it is prompted. |
| `settingSources: []` | No user/project/local settings file is loaded, so nothing on the host can widen the line above afterwards. |
| `skills: []` | Same, for skills. |
| `strictMcpConfig` | No MCP server can arrive from ambient configuration. |

They are exported as one frozen object and asserted by value in `adapters.test.js`, so
re-enabling one is a red build rather than a quiet capability grant.

The credential reaches the model process as an environment variable and by no other route. The
job environment is built from nothing rather than filtered, and the SDK's `env` option *replaces*
the child environment rather than extending it — so `RP_ID`, `ADMIN_UIDS` and the VAPID keys
cannot reach it by inheritance even by accident.

## Off is really off

`COACH_DISABLED=1` forces the Coach off everywhere regardless of what is stored — the fleet
operator's kill switch. With the Coach off, `/api/config` carries no `coach` key at all, so no
Coach UI exists anywhere in the client.

## Health

The Coach programs training; it does not practise medicine. It is told never to diagnose, to
stay conservative when someone describes pain rather than soreness, and to recommend a
professional. **It is not a doctor or a physiotherapist. If something hurts, ask one.**
