/** In-memory sliding window rate limiter (per serverless isolate / process). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export type RateLimitOpts = {
  /** Window length in ms (default 15 minutes). */
  windowMs?: number;
  /** Max hits in the window (default 20). */
  max?: number;
};

export function checkRateLimit(
  key: string,
  opts: RateLimitOpts = {}
): RateLimitResult {
  const windowMs = opts.windowMs ?? 15 * 60 * 1000;
  const max = opts.max ?? 20;
  const now = Date.now();
  const row = buckets.get(key);
  if (!row || row.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (row.count >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((row.resetAt - now) / 1000)) };
  }
  row.count += 1;
  return { ok: true };
}

/** Best-effort client IP behind proxies (Vercel / Cloudflare). */
export function clientIpFromHeaders(headers: {
  get(name: string): string | null | undefined;
}): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  return "unknown";
}

/** Clear buckets (tests only). */
export function _resetRateLimitForTests() {
  buckets.clear();
}
