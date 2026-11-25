import { loadKeyed } from "./drawings/load.js";
import { imageKeys } from "./drawings/manifest.js";

export function loadSkillImage(name) {
  return loadKeyed(imageKeys, name);
}
