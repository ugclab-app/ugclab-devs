import { checkRateLimit } from "./rate-limit.js";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 8;

export function checkFormRateLimit(
  key: string
): { ok: true } | { ok: false; retryAfterSec: number } {
  return checkRateLimit(key, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW });
}

export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
