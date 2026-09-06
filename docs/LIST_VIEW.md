# Workout view — cards / list / compact

The active workout screen (`frontend/src/views/Workout.jsx`) has three layouts, chosen by
`S.workoutView` (`'cards' | 'list' | 'compact'`, default `'cards'`). It is purely
presentational — the same `s.active` session, entries and finish path in every layout, and
every set handler is already entry-index parameterised, so the layouts only change what is
rendered.

| Value | What you see |
|---|---|
| `cards` | One unit at a time, `Prev` / `Next` + swipe. The original flow. |
| `list` | Every unit stacked and scrollable. Each unit has a header (`Exercise n / m`) with a **Set current** chip; the footer's Move / Swap / Remove act on the current unit; completion still auto-advances the marker, starts rest and can open the top-weight sheet. |
| `compact` | `list`, with each `ExerciseBlock` rendered `dense`: no media, no tag chips (Cardio / per-side / target / equipment / **Best:**), no note lines, no "Last time …" recap, no bar-and-plates chip, no progression-guidance line. Just the name, the ⋯ menu and the set rows. Everything stripped is still on the ⋯ menu (note, details, history, bar weight, progression settings) or is display-only. |

Unknown / absent values read as `cards`, so a profile written before the setting existed is
unchanged.

## Where it is set

- **Saved default:** Settings → During a workout → **Workout view** (a 3-way `Segmented`).
- **Per session:** the workout header's **⋮** button opens a `menuSheet` with the three
  layouts; picking one writes `s.active.workoutView`.

`beginWorkout` / `beginBackfill` (`frontend/src/sheets.jsx`) snapshot `S.workoutView` onto
`s.active.workoutView` when the session is created, and the render prefers
`A.workoutView || S.workoutView`. So the ⋮ menu re-lays-out the running session only, and
changing the saved default never disturbs a workout already in progress.

## Tests

Component-level, no new `lib/` helper:

- `frontend/src/views/Workout.test.jsx` — `workout list view`, `workout compact view`,
  `workout view header menu` describe blocks.
- `frontend/src/views/Settings.workoutview.test.jsx` — the 3-way Segmented.
- `frontend/src/sheets.workoutview.test.jsx` — `beginWorkout` / backfill snapshot behaviour.
