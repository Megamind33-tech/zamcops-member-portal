// Minimal in-memory sliding-window rate limiter for auth endpoints.
// Scope note: state lives per server instance, so on serverless each warm
// instance counts separately — this still blunts brute-force and enumeration
// bursts (which hammer one warm instance) without any infrastructure. For hard
// guarantees swap the Map for a shared store (e.g. Upstash Redis) later.

const buckets = new Map<string, number[]>();

// Returns true when the call is allowed, false when the caller should back off.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup so long-lived instances don't accumulate stale keys.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
