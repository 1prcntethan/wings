import assert from "node:assert/strict";
import test from "node:test";
import {
  countLoggedSets,
  formatTrainedTime,
  groupArchiveLogs,
  historyPlaceholders,
  rangeBounds,
  statRangeById,
  summarizeLogs,
  workoutDateCreditsStreak,
} from "./workoutstats.js";

const today = new Date(2026, 10, 20);

test("stat presets cover a week through all time", () => {
  assert.deepEqual(
    ["7d", "14d", "30d", "3m", "6m", "1y", "all"].map((id) => statRangeById(id).kind),
    ["days", "days", "days", "months", "months", "months", "all"],
  );
  assert.equal(statRangeById("30d").label, "Last 30 days");
  assert.equal(statRangeById("missing").id, "30d");
});

test("range bounds are inclusive and all-time has no date window", () => {
  assert.deepEqual(rangeBounds(today, statRangeById("7d")), {
    start: "2026-11-14",
    end: "2026-11-20",
  });
  assert.deepEqual(rangeBounds(today, statRangeById("14d")), {
    start: "2026-11-07",
    end: "2026-11-20",
  });
  assert.deepEqual(rangeBounds(today, statRangeById("30d")), {
    start: "2026-10-22",
    end: "2026-11-20",
  });
  assert.deepEqual(rangeBounds(today, statRangeById("3m")), {
    start: "2026-08-20",
    end: "2026-11-20",
  });
  assert.deepEqual(rangeBounds(today, statRangeById("6m")), {
    start: "2026-05-20",
    end: "2026-11-20",
  });
  assert.deepEqual(rangeBounds(today, statRangeById("1y")), {
    start: "2025-11-20",
    end: "2026-11-20",
  });
  assert.equal(rangeBounds(today, statRangeById("all")), null);
});

test("history folds only include months and years that have workouts", () => {
  const archive = groupArchiveLogs(
    [
      { id: "nov", date: "2026-11-02" },
      { id: "oct", date: "2026-10-04" },
      { id: "old", date: "2015-06-10" },
    ],
    today,
  );
  assert.equal(archive["2026-10"].logs[0].id, "oct");
  assert.equal(archive["2015"].logs[0].id, "old");
  assert.equal(archive["2026-11"], undefined);
  assert.deepEqual(
    historyPlaceholders(archive).map((entry) => entry.label),
    ["October 2026", "2015"],
  );
  assert.deepEqual(historyPlaceholders({}), []);
});

test("set totals prefer a stored count and fall back to sections", () => {
  const sections = {
    primary: [{ name: "Pull-up", sets: "4", efforts: ["8", "8", "8", "8"] }],
    volume: [{ name: "Row", sets: "", efforts: ["12", "12"] }],
    warmup: [{ name: "", sets: "3" }],
  };
  assert.equal(countLoggedSets(sections), 6);
  const summary = summarizeLogs([
    { setCount: 10, sections, durationSec: 600 },
    { sections, durationSec: 120 },
  ]);
  assert.equal(summary.workouts, 2);
  assert.equal(summary.sets, 16);
  assert.equal(summary.durationSec, 720);
  assert.equal(formatTrainedTime(720), "12m");
  assert.equal(formatTrainedTime(null), "—");
  assert.equal(summarizeLogs([{ sections }]).durationSec, null);
  assert.deepEqual(summarizeLogs([{ setCount: 1, durationSec: 24 }, { setCount: 2 }]), {
    workouts: 2,
    sets: 3,
    durationSec: 24,
    timedWorkouts: 1,
  });
  assert.equal(formatTrainedTime(24), "24s");
});

test("a workout credits the streak only on the fitness day it was saved for", () => {
  assert.equal(workoutDateCreditsStreak("2026-11-20", "2026-11-20"), true);
  assert.equal(workoutDateCreditsStreak("2026-11-19", "2026-11-20"), false);
  assert.equal(workoutDateCreditsStreak("", "2026-11-20"), false);
});
