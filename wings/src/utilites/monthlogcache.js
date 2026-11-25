const cache = new Map();

export function monthCacheKey(uid, start, end) {
  return `${uid}:${start}:${end}`;
}

export function peekMonthLogs(key) {
  return cache.get(key) || null;
}

export function storeMonthLogs(key, logs) {
  cache.set(key, { logs, at: Date.now() });
}

export function invalidateMonthLogs(uid) {
  for (const key of cache.keys()) {
    if (String(key).startsWith(`${uid}:`)) cache.delete(key);
  }
}
