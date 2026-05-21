import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "../env.js";

function sign(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

export function createUnsubscribeToken(tenantId: string, email: string): string {
  const exp = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ tenantId, email: email.toLowerCase(), exp })).toString(
    "base64url"
  );
  return `${body}.${sign(body)}`;
}

export function verifyUnsubscribeToken(token: string): { tenantId: string; email: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    if (
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) &&
      sig !== expected
    ) {
      return null;
    }
  } catch {
    if (sig !== expected) return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      tenantId: string;
      email: string;
      exp: number;
    };
    if (!data.tenantId || !data.email || data.exp < Date.now()) return null;
    return { tenantId: data.tenantId, email: data.email };
  } catch {
    return null;
  }
}
