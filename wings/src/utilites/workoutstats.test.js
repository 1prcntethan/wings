import assert from "node:assert/strict";
import test from "node:test";
import {
  countLoggedSets,
  formatTrainedTime,
  groupArchiveLogs,
  historyPlaceholders,
  historySkeleton,
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

test("history placeholders are older months, then past years", () => {
  const skeleton = historySkeleton(today, new Date(2025, 2, 1));
  assert.equal(skeleton.months[0].label, "October 2026");
  assert.equal(skeleton.months.at(-1).label, "January 2026");
  assert.deepEqual(skeleton.years.map((year) => year.label), ["2025"]);

  const capped = historySkeleton(today, new Date(2010, 0, 1));
  assert.equal(capped.years[0].label, "2025");
  assert.equal(capped.years.at(-1).label, "2018");
});

test("history folds only include months and years that have workouts", () => {
  const skeleton = historySkeleton(today, new Date(2025, 2, 1));
  const archive = groupArchiveLogs(
    [
      { id: "nov", date: "2026-11-02" },
      { id: "oct", date: "2026-10-04" },
      { id: "old", date: "2025-06-10" },
    ],
    today,
  );
  assert.equal(archive["2026-10"].logs[0].id, "oct");
  assert.equal(archive["2025"].logs[0].id, "old");
  assert.equal(archive["2026-11"], undefined);
  assert.deepEqual(
    historyPlaceholders(skeleton, archive).map((entry) => entry.key),
    ["2026-10", "2025"],
  );
  assert.deepEqual(historyPlaceholders(skeleton, {}), []);
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
});

test("a workout credits the streak only on the fitness day it was saved for", () => {
  assert.equal(workoutDateCreditsStreak("2026-11-20", "2026-11-20"), true);
  assert.equal(workoutDateCreditsStreak("2026-11-19", "2026-11-20"), false);
  assert.equal(workoutDateCreditsStreak("", "2026-11-20"), false);
});
