type Bucket = {
  count: number;
  resetAt: number;
};

const globalRateLimits = globalThis as typeof globalThis & {
  __fantasyCopilotLaligaRateLimits?: Map<string, Bucket>;
};

const buckets =
  globalRateLimits.__fantasyCopilotLaligaRateLimits ??
  new Map<string, Bucket>();

globalRateLimits.__fantasyCopilotLaligaRateLimits = buckets;

export function takeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  buckets.set(key, current);

  if (buckets.size > 500) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
