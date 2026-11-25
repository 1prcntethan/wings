import { fileSkillElement } from "./skillfileicons.jsx";
import { loadKeyed } from "./drawings/load.js";
import { iconKeys } from "./drawings/manifest.js";

export function loadSvgIcon(name) {
  const file = fileSkillElement(name, "real-skill");
  if (file) return Promise.resolve(file);
  return loadKeyed(iconKeys, name);
}
