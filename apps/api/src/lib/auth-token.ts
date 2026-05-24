import { SignJWT, jwtVerify } from "jose";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { getAuthSecret } from "../env.js";

const COOKIE = "ugclab_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string | null;
  role: string;
  sv: number;
  impBy?: string;
  impEmail?: string;
};

function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    sv: payload.sv,
    ...(payload.impBy ? { impBy: payload.impBy, impEmail: payload.impEmail } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
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
      impBy: payload.impBy ? String(payload.impBy) : undefined,
      impEmail: payload.impEmail ? String(payload.impEmail) : undefined,
    };
  } catch {
    return null;
  }
}

function sessionCookieBase(c: Context) {
  const host = c.req.header("host") ?? "";
  const domain =
    process.env.SESSION_COOKIE_DOMAIN?.trim() ||
    (host === "tescommerce.com" ||
    host.endsWith(".tescommerce.com") ||
    host === "www.tescommerce.com"
      ? ".tescommerce.com"
      : undefined);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, COOKIE, token, {
    ...sessionCookieBase(c),
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, COOKIE, sessionCookieBase(c));
}

export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, COOKIE);
}
