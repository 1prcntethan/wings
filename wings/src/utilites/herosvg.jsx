import "../components/herosvg.css";
import { loadKeyed } from "./drawings/load.js";
import { heroKeys } from "./drawings/manifest.js";

export function loadHero(name) {
  return loadKeyed(heroKeys, name);
}
