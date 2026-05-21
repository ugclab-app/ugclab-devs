import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

let loaded = false;

/** Load .env.local and monorepo root .env before Auth/Prisma run. */
export function loadEnv() {
  if (loaded) return;
  loaded = true;

  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, ".env.local"),
    resolve(cwd, ".env"),
    resolve(cwd, "../../.env"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path, override: false });
    }
  }
}

export function getAuthSecret(): string {
  loadEnv();
  const secret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Add it to apps/merchant-admin/.env.local or the repo root .env file."
    );
  }

  return secret;
}
