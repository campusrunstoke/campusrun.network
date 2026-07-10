/**
 * Fixed-window per-key rate limiter.
 *
 * v1 is in-memory: simple, zero-dependency, good enough to stop a single script
 * from flooding junk. Note it is per-serverless-instance, not global — when we need
 * a hard global limit (or multi-region correctness), swap this for Upstash Redis
 * behind the same function signature. Kept generous so real festival bursts pass.
 */
type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= max) {
    return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}
