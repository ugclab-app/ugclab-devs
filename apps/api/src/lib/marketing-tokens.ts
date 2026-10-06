import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "../env.js";

function sign(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return a === b;
  }
}

export function createUnsubscribeToken(tenantId: string, email: string): string {
  const exp = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const body = Buffer.from(
    JSON.stringify({ tenantId, email: email.toLowerCase(), exp, kind: "unsub" })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyUnsubscribeToken(
  token: string
): { tenantId: string; email: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      tenantId: string;
      email: string;
      exp: number;
      kind?: string;
    };
    if (!data.tenantId || !data.email || data.exp < Date.now()) return null;
    if (data.kind && data.kind !== "unsub") return null;
    return { tenantId: data.tenantId, email: data.email };
  } catch {
    return null;
  }
}

export function createConfirmSubscribeToken(
  tenantId: string,
  email: string
): string {
  const exp = Date.now() + 48 * 60 * 60 * 1000;
  const body = Buffer.from(
    JSON.stringify({
      tenantId,
      email: email.toLowerCase(),
      exp,
      kind: "confirm",
    })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyConfirmSubscribeToken(
  token: string
): { tenantId: string; email: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      tenantId: string;
      email: string;
      exp: number;
      kind?: string;
    };
    if (data.kind !== "confirm") return null;
    if (!data.tenantId || !data.email || data.exp < Date.now()) return null;
    return { tenantId: data.tenantId, email: data.email };
  } catch {
    return null;
  }
}
