# The AI Coach

An optional AI that **designs** a training plan and **revises it from what you actually log**,
running on your own server under your own provider account, off until an admin turns it on.

> This document grows with the feature. What is described here is what has landed: the server
> plumbing, the consent and payload boundary, and the credential model. The validator and the
> apply path, the provider adapters, and the UI arrive in the PRs that follow.

---

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

## Off is really off

`COACH_DISABLED=1` forces the Coach off everywhere regardless of what is stored — the fleet
operator's kill switch. With the Coach off, `/api/config` carries no `coach` key at all, so no
Coach UI exists anywhere in the client.

## Health

The Coach programs training; it does not practise medicine. It is told never to diagnose, to
stay conservative when someone describes pain rather than soreness, and to recommend a
professional. **It is not a doctor or a physiotherapist. If something hurts, ask one.**
