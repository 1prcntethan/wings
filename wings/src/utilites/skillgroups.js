import { skillCategory } from "./skillcategory.js";
import { skillDB } from "./skilltodb.js";
import { skillRP } from "./skilltorp.js";
import { skillTitle } from "./skilltitles.js";

export const GROUP_ORDER = [
  "Horizontal Push",
  "Vertical Push",
  "Horizontal Pull",
  "Vertical Pull",
  "Legs",
  "Core",
];

const FILTER_GROUPS = {
  all: null,
  push: ["Horizontal Push", "Vertical Push"],
  pull: ["Horizontal Pull", "Vertical Pull"],
  legs: ["Legs"],
  core: ["Core"],
};

export const SKILL_FILTERS = [
  { id: "all", label: "All" },
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
];

export function primaryGroup(category) {
  const raw = String(category || "").split("/")[0].trim().toLowerCase();
  if (raw === "horizontal push") return "Horizontal Push";
  if (raw === "vertical push") return "Vertical Push";
  if (raw === "horizontal pull") return "Horizontal Pull";
  if (raw === "vertical pull" || raw === "pull") return "Vertical Pull";
  if (raw === "legs") return "Legs";
  if (raw === "core") return "Core";
  return null;
}

export function skillCatalog() {
  const grouped = new Map(GROUP_ORDER.map((name) => [name, []]));
  for (const [name, category] of skillCategory) {
    const group = primaryGroup(category);
    const id = skillDB.get(name);
    if (!group || !id || !grouped.has(group)) continue;
    grouped.get(group).push({
      name,
      title: skillTitle.get(name) || name,
      id,
      rp: skillRP.get(id) ?? 0,
      group,
    });
  }
  return GROUP_ORDER.map((name) => ({
    name,
    skills: grouped.get(name).slice(),
  })).filter((group) => group.skills.length > 0);
}

export function filterCatalog(catalog, filterId, query) {
  const allowed = FILTER_GROUPS[filterId] ?? null;
  const needle = String(query || "").trim().toLowerCase();
  return catalog
    .map((group) => {
      if (allowed && !allowed.includes(group.name)) return { ...group, skills: [] };
      return {
        ...group,
        skills: group.skills.filter((skill) => {
          if (!needle) return true;
          return (
            skill.title.toLowerCase().includes(needle) ||
            skill.name.toLowerCase().includes(needle) ||
            skill.group.toLowerCase().includes(needle)
          );
        }),
      };
    })
    .filter((group) => group.skills.length > 0);
}

export function skillStatus(progress) {
  const value = Number(progress);
  if (value === 1) return "unlocked";
  if (value === 2) return "in progress";
  if (value === 3) return "mastered";
  return "locked";
}

export function highestReached(userSkills, catalog = skillCatalog()) {
  const reached = [];
  for (const group of catalog) {
    let best = null;
    for (const skill of group.skills) {
      const progress = Number(userSkills?.[skill.id]);
      if (![1, 2, 3].includes(progress)) continue;
      if (
        !best ||
        skill.rp > best.rp ||
        (skill.rp === best.rp && progress > best.progress)
      ) {
        best = { ...skill, progress, status: skillStatus(progress) };
      }
    }
    if (best) reached.push(best);
  }
  return reached;
}

export function masteredCount(skills, userSkills) {
  return skills.filter((skill) => Number(userSkills?.[skill.id]) === 3).length;
}
