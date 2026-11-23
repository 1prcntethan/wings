import { fileSkillElement } from "./skillfileicons.jsx";
import { loadKeyed } from "./drawings/load.js";
import { treeKeys } from "./drawings/manifest.js";

export function loadSkillTreeIcon(name) {
  const file = fileSkillElement(name, "tree-size");
  if (file) return Promise.resolve(file);
  return loadKeyed(treeKeys, name);
}
