import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

try {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  config({ path: path.join(root, ".env") });
  config({ path: path.join(root, ".env.local") });
} catch {
  /* Vercel uses dashboard env vars; local .env is optional */
}

export function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required");
  return s;
}

export const PORT = Number(process.env.API_PORT ?? 4000);
export const MERCHANT_WEB_URL =
  process.env.MERCHANT_ADMIN_URL ?? "http://localhost:3001";
export const PLATFORM_ADMIN_URL =
  process.env.PLATFORM_ADMIN_URL ?? "http://localhost:3003";
export const PLATFORM_URL =
  process.env.PLATFORM_URL ?? process.env.NEXT_PUBLIC_PLATFORM_URL ?? "http://localhost:3000";
