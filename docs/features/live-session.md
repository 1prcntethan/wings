# Feature: Live Workout Session

## Goal
Let a user plan a workout, run it one set at a time with a rest timer, and save the finished sets to the existing workout log.

## Read first
- `AGENTS.md` and `docs/CONTEXT.md`.
- Workout log: `wings/src/pages/workoutlog.jsx`, `saveWorkoutLog` / `getWorkoutLogs` in `wings/src/config/firestore.js`. Collection: `users/{uid}/workoutLogs/{id}`.
- Skill names and metric: `wings/src/utilites/skilltitles.js`, `wings/src/utilites/skillmetric.js` (`Dynamic` or `Isometric`).

## Hard constraints
- Do not modify streak, rank, progress, auth, or Firestore rules. A finished session calls `saveWorkoutLog` only. It does not call `logWorkout`.
- The saved document is only `date`, `category`, `sections`, and `loggedAt` (added by `saveWorkoutLog`). Sections are `warmup`, `primary`, `secondary`, `volume`. Each saved exercise is `name`, `sets`, `measure`, `efforts`, `reps`, `notes`.
- Rest, last-time values, and duration stay in the local draft. They are not written to Firestore.
- No new collection and no new dependencies.
- Past logs are the plans. Copy one into the session. Do not edit the old log.

## Behavior
1. Workout log page: "start session" opens an empty plan. "start" on a past card copies that log. "copy" still fills the old form.
2. Planning is a separate screen. Each exercise has a name, 1–4 sets, reps or hold, notes, and rest. Rest is 1:00 through 6:00 in 30 second steps, default 1:30. Isometric skills start as hold, everything else as reps.
3. Start locks the plan. The live screen shows only the current set, then that exercise's rest timer. Skip rest and end workout are the other controls. There is no rest after the last set.
4. End workout keeps sets that were entered. An exercise with no entered set is left out. The summary saves through `saveWorkoutLog`. A failed save keeps the draft.
5. The draft is in `localStorage` under `wings-live-session`. The log page offers Resume or Discard. Leaving the planner keeps the draft.

## Technical
- Reducer, timer math, and log conversion: `wings/src/utilites/livesession.js`. No React or Firebase imports.
- Rest uses `endsAt`. Remaining time is `endsAt - Date.now()`.
- Screen Wake Lock is requested during the live set and rest, and dropped if the browser refuses.
- Tests: `npm test` in `wings/` (`node --test src/utilites/livesession.test.js`).

## Out of scope
A routines collection, editing the plan after Start, changing rest during the workout, streak credit, storing rest or duration, voice, push notifications, and React Flow.
