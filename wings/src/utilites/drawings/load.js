import { drawingLoaders } from "./manifest.js";

const cache = new Map();

export function loadDrawing(hash) {
  if (!hash) return Promise.resolve(null);
  if (cache.has(hash)) return cache.get(hash);
  const loader = drawingLoaders[hash];
  const pending = loader
    ? loader().then((mod) => mod.default).catch(() => null)
    : Promise.resolve(null);
  cache.set(hash, pending);
  return pending;
}

export function loadKeyed(table, key) {
  if (!table || key == null) return Promise.resolve(null);
  return loadDrawing(table[key]);
}
