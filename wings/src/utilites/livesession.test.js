import assert from "node:assert/strict";
import test from "node:test";
import {
  REST_STEPS,
  blankSession,
  effortError,
  parseDraft,
  planError,
  remainingMs,
  serializeDraft,
  normalizeWorkoutLog,
  sessionFromLog,
  sessionReducer,
  sessionToLog,
} from "./livesession.js";

function named(state, id, patch) {
  return sessionReducer(state, { type: "updateExercise", id, patch });
}

function readyPlan() {
  let state = sessionReducer(blankSession(), { type: "addExercise", section: "volume" });
  state = named(state, "1", { name: "Push-up", sets: 2, restSec: 120 });
  state = sessionReducer(state, { type: "addExercise", section: "warmup" });
  state = named(state, "2", { name: "Scapula Pull-up", sets: 1, measure: "hold", restSec: 60 });
  return state;
}

test("rest steps run from 1:00 to 6:00 by 30 seconds", () => {
  assert.deepEqual(REST_STEPS[0], 60);
  assert.deepEqual(REST_STEPS.at(-1), 360);
  for (let index = 1; index < REST_STEPS.length; index += 1) {
    assert.equal(REST_STEPS[index] - REST_STEPS[index - 1], 30);
  }
});

test("exercises stay in section order and section caps hold", () => {
  let state = sessionReducer(blankSession(), { type: "addExercise", section: "volume" });
  state = sessionReducer(state, { type: "addExercise", section: "warmup" });
  assert.deepEqual(
    state.exercises.map((exercise) => exercise.section),
    ["warmup", "volume"],
  );

  state = sessionReducer(state, { type: "addExercise", section: "warmup" });
  const capped = sessionReducer(state, { type: "addExercise", section: "warmup" });
  assert.equal(capped, state);
  assert.equal(state.exercises.filter((exercise) => exercise.section === "warmup").length, 2);
});

test("a rest value off the step list is rejected", () => {
  let state = sessionReducer(blankSession(), { type: "addExercise", section: "primary" });
  const rejected = named(state, "1", { restSec: 45 });
  assert.equal(rejected, state);
  state = named(state, "1", { restSec: 120 });
  assert.equal(state.exercises[0].restSec, 120);
});

test("planning edits are rejected after start", () => {
  const started = sessionReducer(readyPlan(), { type: "start", now: 1_000 });
  assert.equal(started.phase, "exercising");
  assert.equal(sessionReducer(started, { type: "addExercise", section: "volume" }), started);
  assert.equal(
    sessionReducer(started, { type: "updateExercise", id: "2", patch: { sets: 4 } }),
    started,
  );
  assert.equal(sessionReducer(started, { type: "removeExercise", id: "2" }), started);
  assert.equal(sessionReducer(started, { type: "setCategory", category: "pull" }), started);
});

test("start is rejected until the plan is complete", () => {
  const empty = blankSession();
  assert.equal(sessionReducer(empty, { type: "start", now: 1 }), empty);
  assert.ok(planError(empty));

  let state = sessionReducer(empty, { type: "addExercise", section: "primary" });
  assert.equal(sessionReducer(state, { type: "start", now: 1 }), state);
});

test("completeSet is rejected while resting", () => {
  let state = sessionReducer(readyPlan(), { type: "start", now: 5_000 });
  state = sessionReducer(state, { type: "completeSet", value: "8", now: 6_000 });
  assert.equal(state.phase, "resting");
  assert.equal(sessionReducer(state, { type: "completeSet", value: "8", now: 7_000 }), state);
});

test("remaining time uses the end timestamp and clamps at zero", () => {
  assert.equal(remainingMs(10_000, 4_000), 6_000);
  assert.equal(remainingMs(10_000, 10_000), 0);
  assert.equal(remainingMs(10_000, 25_000), 0);
});

test("rest finishes only at the end timestamp, and skip moves on", () => {
  let state = sessionReducer(readyPlan(), { type: "start", now: 0 });
  assert.equal(state.exercises[0].name, "Scapula Pull-up");
  state = sessionReducer(state, { type: "completeSet", value: "12.5", now: 1_000 });
  assert.equal(state.endsAt, 61_000);
  assert.equal(sessionReducer(state, { type: "restFinished", now: 60_999 }), state);

  const finished = sessionReducer(state, { type: "restFinished", now: 61_000 });
  assert.equal(finished.phase, "exercising");
  assert.deepEqual(finished.cursor, { exerciseIndex: 1, setIndex: 0 });

  const skipped = sessionReducer(state, { type: "skipRest" });
  assert.equal(skipped.phase, "exercising");
  assert.equal(skipped.endsAt, null);
});

test("the last set ends the workout with no rest", () => {
  let state = named(sessionReducer(blankSession(), { type: "addExercise", section: "primary" }), "1", {
    name: "Dip",
    sets: 1,
  });
  state = sessionReducer(state, { type: "start", now: 10 });
  state = sessionReducer(state, { type: "completeSet", value: "5", now: 20 });
  assert.equal(state.phase, "summary");
  assert.equal(state.endsAt, null);
});

test("ending early keeps completed sets and drops the rest", () => {
  let state = sessionReducer(readyPlan(), { type: "start", now: 0 });
  state = sessionReducer(state, { type: "completeSet", value: "10", now: 1_000 });
  state = sessionReducer(state, { type: "skipRest" });
  state = sessionReducer(state, { type: "completeSet", value: "6", now: 2_000 });
  state = sessionReducer(state, { type: "endWorkout" });

  const log = sessionToLog(state, "2026-10-27");
  assert.deepEqual(Object.keys(log), ["date", "category", "sections"]);
  assert.deepEqual(Object.keys(log.sections.volume[0]), [
    "name",
    "sets",
    "measure",
    "efforts",
    "reps",
    "notes",
    "restSec",
  ]);
  assert.equal(log.sections.warmup.length, 1);
  assert.equal(log.sections.warmup[0].name, "Scapula Pull-up");
  assert.equal(log.sections.volume.length, 1);
  assert.deepEqual(log.sections.volume[0], {
    name: "Push-up",
    sets: "1",
    measure: "reps",
    efforts: ["6"],
    reps: "6",
    notes: "",
    restSec: 120,
  });
  assert.equal(log.sections.primary.length, 0);
  assert.equal(log.sections.secondary.length, 0);
  assert.equal(log.sections.warmup[0].restSec, 60);
  assert.equal(log.sections.volume[0].restSec, 120);
});

test("old workout logs without rest or newer fields still open", () => {
  const legacy = {
    date: "2024-03-01",
    category: "push",
    sections: {
      warmup: [{ name: "arm circles", sets: 2, reps: 15, notes: "easy" }],
    },
  };
  const normalized = normalizeWorkoutLog(legacy);
  assert.equal(normalized.sections.warmup[0].restSec, null);
  assert.equal(normalized.sections.warmup[0].measure, "reps");
  assert.deepEqual(normalized.sections.warmup[0].efforts, []);
  assert.equal(normalized.sections.warmup[0].reps, "15");
  assert.equal(normalized.sections.primary.length, 0);
  assert.equal(normalized.sections.secondary.length, 0);
  assert.equal(normalized.sections.volume.length, 0);

  const session = sessionFromLog(legacy);
  assert.equal(session.exercises[0].restSec, 90);
  assert.deepEqual(session.exercises[0].lastTime, ["15"]);

  const broken = normalizeWorkoutLog({
    category: 4,
    sections: { warmup: "nope", primary: [null, "bad", { name: "Dip", sets: "2", reps: "8, 6" }] },
  });
  assert.equal(broken.date, "");
  assert.equal(broken.sections.warmup.length, 0);
  assert.equal(broken.sections.primary.length, 1);
  assert.equal(broken.sections.primary[0].restSec, null);
  assert.doesNotThrow(() => sessionFromLog(null));
  assert.doesNotThrow(() => sessionFromLog(broken));

  const draft = parseDraft(JSON.stringify({
    phase: "planning",
    category: "push",
    exercises: [{ id: "1", section: "primary", name: "Dip", sets: 2 }],
    nextId: 2,
    cursor: null,
    endsAt: null,
    startedAt: null,
  }));
  assert.equal(draft.exercises[0].restSec, 90);
  assert.deepEqual(draft.exercises[0].efforts, []);
});

test("a past log becomes a plan with last time kept off the new efforts", () => {
  const session = sessionFromLog({
    category: "pull",
    sections: {
      warmup: [],
      primary: [
        {
          name: "band pull apart",
          sets: "3",
          measure: "reps",
          efforts: ["12", "10", "8"],
          reps: "12, 10, 8",
          notes: "slow",
        },
      ],
      secondary: [],
      volume: [{ name: "   ", sets: "2", measure: "reps", efforts: [], reps: "", notes: "" }],
    },
  });
  assert.equal(session.category, "pull");
  assert.equal(session.exercises.length, 1);
  assert.deepEqual(session.exercises[0].lastTime, ["12", "10", "8"]);
  assert.deepEqual(session.exercises[0].efforts, []);
  assert.equal(session.exercises[0].restSec, 90);

  const started = sessionReducer(session, { type: "start", now: 5 });
  const done = sessionReducer(started, { type: "endWorkout" });
  assert.equal(sessionToLog(done, "2026-10-27").sections.primary.length, 0);
});

test("invalid effort is rejected and a valid hold is stored", () => {
  assert.ok(effortError("reps", "0"));
  assert.equal(effortError("hold", "12.5"), null);
  let state = named(sessionReducer(blankSession(), { type: "addExercise", section: "primary" }), "1", {
    name: "Handstand",
    sets: 1,
    measure: "hold",
  });
  state = sessionReducer(state, { type: "start", now: 1 });
  const rejected = sessionReducer(state, { type: "completeSet", value: "nope", now: 2 });
  assert.equal(rejected, state);
  const saved = sessionReducer(state, { type: "completeSet", value: "12.5", now: 2 });
  assert.deepEqual(saved.exercises[0].efforts, ["12.5"]);
});

test("a draft round-trips and junk does not", () => {
  const state = readyPlan();
  assert.deepEqual(parseDraft(serializeDraft(state)), state);
  assert.equal(parseDraft("{"), null);
  assert.equal(parseDraft(JSON.stringify({ phase: "nope" })), null);
  assert.equal(parseDraft(""), null);
});
