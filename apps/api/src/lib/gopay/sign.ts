import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Fresh nonce for GoPay API (≤ 32 chars, no hyphens). */
export function newGoPayNonce(): string {
  return randomBytes(16).toString("hex");
}

/** HMAC-SHA512 upper-case hex — payload is `nonce + "\\n" + body + "\\n"`. */
export function signGoPayPayload(
  body: string,
  nonce: string,
  secretKey: string
): string {
  const payload = `${nonce}\n${body}\n`;
  return createHmac("sha512", secretKey)
    .update(payload, "utf8")
    .digest("hex")
    .toUpperCase();
}

export function verifyGoPaySignature(
  body: string,
  nonce: string,
  signature: string,
  secretKey: string
): boolean {
  const expected = signGoPayPayload(body, nonce, secretKey);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toUpperCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
