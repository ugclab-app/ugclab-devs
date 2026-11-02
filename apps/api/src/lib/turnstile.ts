import type { Context } from "hono";
import { clientIpFromHeaders } from "./rate-limit.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Platform-wide keys protect merchant login / signup / magic link. */
export function platformTurnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY?.trim() || null;
}

function platformSecret(): string | null {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || null;
}

export function platformTurnstileConfigured(): boolean {
  return Boolean(platformTurnstileSiteKey() && platformSecret());
}

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIp?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: "Captcha required" };
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") form.set("remoteip", remoteIp);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true };
    const codes = data["error-codes"] ?? [];
    return {
      ok: false,
      error: codes.includes("timeout-or-duplicate")
        ? "Captcha expired. Please try again."
        : "Captcha verification failed",
    };
  } catch {
    // Verification endpoint unreachable: fail closed only when we definitely have a token problem.
    return { ok: false, error: "Captcha verification unavailable. Please try again." };
  }
}

function tokenFromBody(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const o = body as Record<string, unknown>;
  return String(o.turnstileToken ?? o["cf-turnstile-response"] ?? "").trim();
}

/**
 * Gate a merchant-facing auth route. Returns a 400 response when the captcha is
 * configured and the token is missing or invalid; null when the request may proceed.
 */
export async function requirePlatformTurnstile(
  c: Context,
  body: unknown
): Promise<Response | null> {
  const secret = platformSecret();
  if (!secret || !platformTurnstileSiteKey()) return null;
  const token = tokenFromBody(body);
  const r = await verifyTurnstileToken(token, secret, clientIpFromHeaders(c.req.raw.headers));
  if (r.ok) return null;
  return c.json({ error: r.error ?? "Captcha verification failed", captcha: true }, 400);
}

/** Per-store captcha for storefront checkout / customer login. */
export async function requireStoreTurnstile(
  c: Context,
  settings: { turnstileSiteKey?: string | null; turnstileSecretKey?: string | null } | null | undefined,
  body: unknown
): Promise<Response | null> {
  const secret = settings?.turnstileSecretKey?.trim();
  if (!secret || !settings?.turnstileSiteKey?.trim()) return null;
  const token = tokenFromBody(body);
  const r = await verifyTurnstileToken(token, secret, clientIpFromHeaders(c.req.raw.headers));
  if (r.ok) return null;
  return c.json({ error: r.error ?? "Captcha verification failed", captcha: true }, 400);
}
