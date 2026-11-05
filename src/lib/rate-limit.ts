// Fixed-window in-memory limiter. Per server instance: on serverless this is best effort,
// swap for a shared store (Redis/Upstash) if you run many instances.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs = 60_000): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  return b.count > max ? { ok: false, retryAfterSec: Math.ceil((b.reset - now) / 1000) } : { ok: true, retryAfterSec: 0 };
}
