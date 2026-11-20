import assert from "node:assert/strict";
import test from "node:test";
import { skillDB } from "./skilltodb.js";
import {
  filterCatalog,
  highestReached,
  primaryGroup,
  skillCatalog,
} from "./skillgroups.js";

test("movement groups come from the skill category labels", () => {
  assert.equal(primaryGroup("Horizontal Push/Vertical Push"), "Horizontal Push");
  assert.equal(primaryGroup("Vertical Pull/Push "), "Vertical Pull");
  assert.equal(primaryGroup("Core/Push/Pull"), "Core");
  assert.equal(primaryGroup("Pull"), "Vertical Pull");

  const catalog = skillCatalog();
  const skills = catalog.flatMap((group) => group.skills);
  const ids = skills.map((skill) => skill.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(skills.find((skill) => skill.id === "dip").group, "Horizontal Push");
  assert.equal(skills.find((skill) => skill.id === "victorian").group, "Vertical Pull");
  assert.equal(skills.length, [...skillDB.keys()].length);
});

test("the highest reached skill is the furthest rank-point node in the group", () => {
  const reached = highestReached({
    "inverted-row": 3,
    "tuck-fl": 2,
    "adv-tuck-fl": 0,
    "handstand": 2,
    "push-up": 3,
  });
  assert.equal(
    reached.find((skill) => skill.group === "Horizontal Pull").id,
    "tuck-fl",
  );
  assert.equal(
    reached.find((skill) => skill.group === "Horizontal Pull").status,
    "in progress",
  );
  assert.equal(reached.find((skill) => skill.group === "Horizontal Push").id, "push-up");
  assert.equal(reached.some((skill) => skill.group === "Legs"), false);
});

test("list filters keep a path only when a skill matches", () => {
  const catalog = skillCatalog();
  const pulls = filterCatalog(catalog, "pull", "tuck fl");
  assert.ok(pulls.every((group) => group.name.includes("Pull")));
  assert.ok(pulls.some((group) => group.skills.some((skill) => skill.id === "tuck-fl")));
  assert.equal(filterCatalog(catalog, "legs", "planche").length, 0);
});
