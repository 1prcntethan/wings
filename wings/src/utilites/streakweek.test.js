import assert from "node:assert/strict";
import test from "node:test";
import { weekDots } from "./streakweek.js";

test("week dots fill the live streak and leave today open", () => {
  const dots = weekDots(new Date(2026, 10, 20), {
    current: 4,
    lastLog: "2026-11-19",
  });
  assert.deepEqual(
    dots.map((dot) => dot.state),
    ["logged", "logged", "logged", "logged", "today", "future", "future"],
  );
  assert.deepEqual(
    dots.map((dot) => dot.label),
    ["M", "T", "W", "T", "F", "S", "S"],
  );
});

test("a broken streak does not fill past days", () => {
  const dots = weekDots(new Date(2026, 10, 20), {
    current: 6,
    lastLog: "2026-11-17",
  });
  assert.equal(dots.filter((dot) => dot.state === "logged").length, 0);
  assert.equal(dots[4].state, "today");
});
