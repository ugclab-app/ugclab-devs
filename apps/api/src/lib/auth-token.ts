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
};

function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
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
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, COOKIE, { path: "/" });
}

export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, COOKIE);
}
