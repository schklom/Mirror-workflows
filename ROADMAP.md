# Roadmap

What openGym is heading towards, in the order it is likely to land. Each block is a GitLab
milestone; the issues and merge requests attached to a milestone are the plan, this file is the
summary. Dates are intentions, not promises — a self-hosted, one-maintainer project ships when
the branch has been used in a real gym for a week.

Board: https://gitlab.com/DuarteSantos8/opengym/-/boards (planned → in progress → in review).
Milestones: https://gitlab.com/DuarteSantos8/opengym/-/milestones

## v1.4 — Cleaner workout  (September 2026)

The workout screen gets out of the way. One "⋯" menu per exercise instead of rows of buttons,
the set number as the set's own menu, an optional list view of the whole session with a pinned
header, and four switches in Settings to bring any of the old button groups back.

- Workout view: cards or scrollable list (!96, #28, #44, #50)
- One menu per exercise and per set; "Workout controls" in Settings (#20)
- Automatic working weight, no confirmation prompt (!92, #18)
- Stepper fixes: one tap = one step in supersets (!97, #41), per-exercise increment (!84)
- Progression: routines with progression off keep their targets (!71), no deload spiral (!93)
- Starter plans: Push/Pull/Legs, Upper/Lower, Full Body, 5×5 (!94)
- Muscle explorer in the library and the exercise picker (!87)
- Copy routine (!85), quick-add "+" in the exercise picker (!72)
- Timer flash blinks the theme; no replay after the app was in the background (!89)
- MCP: `preview_session`, per-exercise rest (!90, !81, #36)
- Coach: schema requires routine ids and a week (!99)
- Fixes: nginx re-resolves the api container (#16), Renovate config (#37)
- Open: Resume returns to the exercise you were on (#21), the centre button during a workout (#29),
  AI Coach on Android with an API key (#42), favourite exercises (#6)

## v1.5 — Programmes & progression  (October 2026)

Training structure beyond one weekly template. This is largely the Space-Hermes series of merge
requests, reviewed one by one because together they change the training model.

- Explicit warm-up / work phases with per-phase settings during a workout (!76, !56)
- Choose which set drives AMRAP progression (!78)
- Multi-week programmes with deload and rest weeks (!98, #15)
- Per-exercise strength with an adaptive estimated 1RM (!50)
- Import: weights normalised to the profile unit, safer parsing (!53); plan sharing hardened (!49)
- Home: several routines on one day, session chooser (!74)
- Resistance bands treated like bodyweight (#39)
- Exercise history and a progress chart from inside the workout (#43)
- Colour-coded RIR/RPE picker (!91, #32); pictures for custom exercises (#30)

## v1.6 — Accounts & sync  (November 2026)

Who may sign in, and what else may read or write your data.

- Optional username + password login next to passkeys (#1)
- OIDC login for people with an existing SSO (#40)
- Personal-trainer role: invite students, write their plan (!79, #8)
- Remote MCP with OAuth for hosted AI clients; MCP write tools (!88, #24)
- Unit switch converts stored values (#22); offline use of saved routines (#23)
- Sync reports (#25, #33) — still waiting on details from the reporters

## v1.7 — Mobile  (December 2026)

- In-app update check and APK install (!40, #38, #9)
- Rest timer in the notification bar / on the lock screen (#19, #26)
- Body weight from Withings or the phone's health store (#31)

## Ideas, not scheduled

- Skins alongside the accent colour (#34), background wallpapers (#48)
- A big-screen / kiosk layout (#49) and a physical "next" button (#47)
- Native NixOS module (!83) and Azure App Service deployment (!35) — only if someone maintains them
- Arabic and right-to-left layout (!36) — needs a rebase, then a visual round

## How things move

An issue on the board goes planned → in progress → in review. "In review" means the change is on a
branch and deployed to gym-test.duarte-santos.ch, where the owner tries it in a real session.
Merge requests from returning contributors get their pipeline started here automatically; a first
MR is started by hand after a look at the diff. Releases bundle whatever has passed that test.
