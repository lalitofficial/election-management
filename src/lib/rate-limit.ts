type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

/**
 * Returns true if the request is within limits, false if rate-limited.
 * Key is typically IP + route identifier.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function clearRateLimit(key: string) {
  store.delete(key);
}

// Prune expired entries every 5 minutes to avoid unbounded memory growth.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
      }
    },
    5 * 60_000,
  );
}
