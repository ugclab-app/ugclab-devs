import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_SECONDS = 5 * 60;

function secretBytes(secret: string): Buffer {
  const trimmed = secret.trim();
  const payload = trimmed.startsWith("whsec_") ? trimmed.slice("whsec_".length) : trimmed;
  return Buffer.from(payload, "base64");
}

/** Svix signature used by Resend webhooks (`v1,<base64>`). */
export function verifyResendWebhook(input: {
  payload: string;
  id: string;
  timestamp: string;
  signature: string;
  secret: string;
  nowMs?: number;
}): boolean {
  const ts = Number(input.timestamp);
  const now = (input.nowMs ?? Date.now()) / 1000;
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_SECONDS) return false;
  if (!input.id || !input.signature) return false;

  const signed = `${input.id}.${input.timestamp}.${input.payload}`;
  const expected = createHmac("sha256", secretBytes(input.secret)).update(signed).digest("base64");
  const expectedBuf = Buffer.from(expected);

  for (const part of input.signature.split(" ")) {
    const sig = part.startsWith("v1,") ? part.slice(3) : "";
    if (!sig) continue;
    const got = Buffer.from(sig);
    if (got.length !== expectedBuf.length) continue;
    if (timingSafeEqual(got, expectedBuf)) return true;
  }
  return false;
}
