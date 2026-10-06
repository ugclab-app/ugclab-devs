import { SignJWT, jwtVerify } from "jose";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { getAuthSecret, MERCHANT_WEB_URL } from "../env.js";

const COOKIE = "ugclab_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string | null;
  role: string;
  sv: number;
  /** Active merchant store (tenant) id */
  tid?: string;
  impBy?: string;
  impEmail?: string;
};

function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function signSession(
  payload: SessionPayload,
  opts?: { expiresIn?: string }
) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    sv: payload.sv,
    ...(payload.tid ? { tid: payload.tid } : {}),
    ...(payload.impBy ? { impBy: payload.impBy, impEmail: payload.impEmail } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(opts?.expiresIn ?? "7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: payload.name ? String(payload.name) : null,
      role: String(payload.role ?? "MERCHANT"),
      sv: Number(payload.sv ?? 0),
      tid: payload.tid ? String(payload.tid) : undefined,
      impBy: payload.impBy ? String(payload.impBy) : undefined,
      impEmail: payload.impEmail ? String(payload.impEmail) : undefined,
    };
  } catch {
    return null;
  }
}

function resolveSessionCookieDomain(c: Context): string | undefined {
  const explicit = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (explicit) {
    return explicit.startsWith(".") ? explicit : `.${explicit}`;
  }

  const hosts = [
    c.req.header("x-forwarded-host"),
    c.req.header("host"),
  ]
    .filter(Boolean)
    .map((h) => h!.split(",")[0]!.trim().split(":")[0]!.toLowerCase());

  for (const h of hosts) {
    if (h === "tescommerce.com" || h.endsWith(".tescommerce.com")) {
      return ".tescommerce.com";
    }
  }

  try {
    const adminHost = new URL(MERCHANT_WEB_URL).hostname.toLowerCase();
    if (adminHost.endsWith("tescommerce.com")) return ".tescommerce.com";
  } catch {
    /* ignore */
  }

  return undefined;
}

function sessionCookieBase(c: Context) {
  const domain = resolveSessionCookieDomain(c);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export function setSessionCookie(
  c: Context,
  token: string,
  opts?: { remember?: boolean }
) {
  const maxAge = opts?.remember
    ? 60 * 60 * 24 * 30
    : 60 * 60 * 24 * 7;
  setCookie(c, COOKIE, token, {
    ...sessionCookieBase(c),
    maxAge,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, COOKIE, sessionCookieBase(c));
}

export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, COOKIE);
}
