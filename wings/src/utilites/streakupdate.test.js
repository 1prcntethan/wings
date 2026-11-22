import assert from "node:assert/strict";
import test from "node:test";
import { buildStreakUpdate, formatStreakDay } from "./streakupdate.js";

const todayDate = new Date(2026, 10, 22);
const today = formatStreakDay(todayDate);
const yesterday = formatStreakDay(new Date(2026, 10, 21));

test("first workout of the day starts or continues a streak", () => {
  const fresh = buildStreakUpdate({ streak: { current: 0, longest: 0, lastLog: null }, workout: 0, rest: 0 }, "workout", todayDate);
  assert.equal(fresh.streak.lastLog, today);
  assert.equal(fresh.streak.lastLogType, "workout");
  assert.equal(fresh.workout, 1);

  const continued = buildStreakUpdate(
    { streak: { current: 4, longest: 4, lastLog: yesterday }, workout: 3, rest: 1 },
    "workout",
    todayDate,
  );
  assert.equal(continued.streak.current, 5);
  assert.equal(continued.workout, 4);
});

test("a rest day after a workout day is a no-op for streak credit", () => {
  const afterWorkout = buildStreakUpdate(
    {
      streak: { current: 2, longest: 2, lastLog: today, lastLogType: "workout" },
      workout: 1,
      rest: 0,
    },
    "rest",
    todayDate,
  );
  assert.equal(afterWorkout, null);
});

test("a workout after a rest day upgrades the day without changing streak length", () => {
  const upgraded = buildStreakUpdate(
    {
      streak: { current: 3, longest: 5, lastLog: today, lastLogType: "rest" },
      workout: 2,
      rest: 4,
    },
    "workout",
    todayDate,
  );
  assert.equal(upgraded.streak.current, 3);
  assert.equal(upgraded.streak.lastLogType, "workout");
  assert.equal(upgraded.workout, 3);
  assert.equal(upgraded.rest, 3);
});