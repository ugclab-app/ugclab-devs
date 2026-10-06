/** Finik KG QR — https://www.finik.kg/documentation/web-sdk/integration/ */

import { FINIK_DOC_WEBHOOK_PUBLIC_KEYS } from "./webhook-keys.js";

export function getFinikApiBase(): string {
  return (
    process.env.FINIK_API_BASE?.trim() ||
    (process.env.FINIK_BETA === "1" || process.env.FINIK_BETA === "true"
      ? "https://beta.api.acquiring.averspay.kg"
      : "https://api.acquiring.averspay.kg")
  ).replace(/\/$/, "");
}

/** Normalize PEM from env (literal newlines or \n escapes; optional base64). */
export function normalizePem(raw: string | undefined | null): string | null {
  const s = raw?.trim();
  if (!s) return null;
  if (s.includes("BEGIN")) {
    return s.replace(/\\n/g, "\n");
  }
  try {
    const decoded = Buffer.from(s, "base64").toString("utf8");
    if (decoded.includes("BEGIN")) return decoded;
  } catch {
    /* not base64 */
  }
  return s.replace(/\\n/g, "\n");
}

export function getFinikPrivatePem(): string | null {
  return normalizePem(process.env.FINIK_PRIVATE_PEM);
}

/** Env key first, then documented Finik webhook public keys. */
export function getFinikWebhookPublicPems(): string[] {
  const fromEnv =
    normalizePem(process.env.FINIK_WEBHOOK_PUBLIC_PEM) ??
    normalizePem(process.env.FINIK_BETA_PUBLIC_KEY);
  const keys: string[] = [];
  if (fromEnv) keys.push(fromEnv);
  for (const k of FINIK_DOC_WEBHOOK_PUBLIC_KEYS) {
    if (!keys.includes(k)) keys.push(k);
  }
  return keys;
}

export function getFinikWebhookPublicPem(): string | null {
  return getFinikWebhookPublicPems()[0] ?? null;
}

export function isFinikConfigured(): boolean {
  return Boolean(
    process.env.FINIK_API_KEY?.trim() &&
      getFinikPrivatePem() &&
      process.env.FINIK_ACCOUNT_ID?.trim()
  );
}

export function getFinikAccountId(): string {
  return process.env.FINIK_ACCOUNT_ID?.trim() ?? "";
}

export function getFinikQrName(): string {
  return (
    process.env.FINIK_QR_NAME?.trim() ||
    process.env.PLATFORM_BRAND_NAME?.trim() ||
    "Store"
  );
}

/** Use Finik QR when store currency is KGS and platform keys are set. */
export function shouldUseFinikCheckout(currency: string): boolean {
  return isFinikConfigured() && currency.toUpperCase() === "KGS";
}
