# Importing Data

## Plans

Plans can be imported from a plain text json file.
The app supports exporting plans in that format. Exports always contain *every* currently present plan.
The IDs of the exercises have to match the IDs in the database, so it will be a bit tedious to write your own.

If you don't want to share every plan that you have currently created, you can either:
- edit the exported json with a text editor  
  or (if you don't feel like editing json files):
- open the [Demo](https://opengym.duarte-santos.ch/demo/#/home), import your plans, make changes and export a new json file to share.


## History

To import your history from other applications, you'll need an export that is in a `csv` format.
The app tries to match the exercise names to link them to the exercises in the database.

> Note: The history is a log of past exercises. There is no converting to a new workout plan.

These apps have been tested to work:

| App | How to export | Notes |
|---|---|---|
| **FitNotes (Android)** | Settings → Backup/Export → **Spreadsheet Export** | Plain one-row-per-set CSV of workouts (or body tracker). Also has a proprietary `.fitnotes` backup DB (richer metadata). The CSV is export-only within the app itself. |
| **FitNotes 2 (iOS)** | Export workouts as CSV; also manual/auto iCloud backups | Can also *import* the original FitNotes DB/CSV and other fitness apps' CSVs. Supports RPE + RIR per set. |
| **Strong** | Settings → Export Data | One row per set; includes `Weight` with unit templated into header, `RPE`, `Notes`. Hevy can import Strong's CSV directly. |
| **Hevy** | Profile → Settings → Export & Import Data (Workouts or Measurements) | Headers: `title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight_lbs/weight_kg, reps, distance_miles/distance_km, duration_seconds, rpe` |

You can also create your own plain `csv`:

### Minimal Example

```csv
workout name,exercise,date,weight kg,reps
Leg Day,Squat,2026-08-21,120,5
Leg Day,Squat,2026-08-21,125,4
Leg Day,Leg Press,2026-08-21,200,1
```
These field names are supported:

| Canonical Field | Supported CSV Headers (first match wins) |
|---|---|
| `exercise` | `exercise`, `exercise name`, `exercise title` |
| `date` | `date`, `workout date` |
| `startTime` | `start time` |
| `endTime` | `end time` |
| `workoutName` | `workout name`, `title` |
| `category` | `category`, `body part`, `muscle group` |
| `weightKg` | `weight kg` |
| `weightLb` | `weight lbs`, `weight lb` |
| `weight` | `weight` |
| `weightUnit` | `weight unit`, `unit` |
| `reps` | `reps`, `repetitions` |
| `rpe` | `rpe`, `rpe rating` |
| `rir` | `rir`, `reps in reserve` |
| `distanceKm` | `distance km` |
| `distance` | `distance` |
| `distanceUnit` | `distance unit` |
| `seconds` | `seconds`, `duration seconds` |
| `time` | `time`, `duration` |
| `setType` | `set type` |
| `note` | `comment`, `comments`, `notes`, `note` |


