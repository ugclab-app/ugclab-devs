/**
 * Generate Prisma Client with a PostgreSQL URL so the query engine is included.
 * When DATABASE_URL is prisma:// / prisma+postgres://, `prisma generate` produces
 * an Accelerate-only client (engine=none) that rejects DIRECT_URL at runtime (P6001).
 */
import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(root, ".env"), override: true });
config({ path: path.join(root, ".env.local"), override: true });

function isPostgres(url) {
  return Boolean(
    url?.startsWith("postgres://") || url?.startsWith("postgresql://")
  );
}

function isAccelerate(url) {
  return Boolean(
    url?.startsWith("prisma://") || url?.startsWith("prisma+postgres://")
  );
}

const direct = process.env.DIRECT_URL?.trim();
const db = process.env.DATABASE_URL?.trim();

if (isPostgres(direct)) {
  process.env.DATABASE_URL = direct;
  console.log("[prisma generate] using DIRECT_URL (postgres) so query engine is included");
} else if (isAccelerate(db) && !isPostgres(db)) {
  console.error(
    "[prisma generate] DATABASE_URL is Accelerate-only and DIRECT_URL is missing.\n" +
      "Set DIRECT_URL=postgres://... in .env so local Node can use TCP."
  );
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
  cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
});

process.exit(result.status ?? 1);
