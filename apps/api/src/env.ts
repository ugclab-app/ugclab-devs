import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

try {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  // override: true — shell/turbo stale DATABASE_URL must not win over repo .env
  config({ path: path.join(root, ".env"), override: true });
  config({ path: path.join(root, ".env.local"), override: true });
} catch {
  /* Vercel uses dashboard env vars; local .env is optional */
}

/** Use Supabase integration vars only when DATABASE_URL is not set on Vercel. */
const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
const isAccelerate =
  dbUrl.startsWith("prisma://") || dbUrl.startsWith("prisma+postgres://");

if (!isAccelerate) {
  if (!dbUrl) {
    if (process.env.POSTGRES_PRISMA_URL?.trim()) {
      process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL.trim();
    } else if (process.env.POSTGRES_URL?.trim()) {
      process.env.DATABASE_URL = process.env.POSTGRES_URL.trim();
    }
  }
  if (!process.env.DIRECT_URL?.trim() && process.env.POSTGRES_URL_NON_POOLING?.trim()) {
    process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING.trim();
  }
} else if (process.env.VERCEL) {
  // On Vercel only Accelerate — drop leftover Supabase DIRECT_URL from integrations
  delete process.env.DIRECT_URL;
}

export function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required");
  return s;
}

export const PORT = Number(process.env.API_PORT ?? 4000);

function resolveMerchantWebUrl(): string {
  const configured = (process.env.MERCHANT_ADMIN_URL ?? process.env.MERCHANT_WEB_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  const looksLocal = !configured || /localhost|127\.0\.0\.1/i.test(configured);
  if (process.env.VERCEL && looksLocal) return "https://admin.tescommerce.com";
  return configured || "http://localhost:3001";
}

export const MERCHANT_WEB_URL = resolveMerchantWebUrl();
if (process.env.VERCEL) {
  process.env.MERCHANT_ADMIN_URL = MERCHANT_WEB_URL;
  process.env.MERCHANT_WEB_URL = MERCHANT_WEB_URL;
}
export const PLATFORM_ADMIN_URL =
  process.env.PLATFORM_ADMIN_URL ?? "http://localhost:3003";
export const PLATFORM_URL =
  process.env.PLATFORM_URL ?? process.env.NEXT_PUBLIC_PLATFORM_URL ?? "http://localhost:3000";
