import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(join(root, ".env"), "utf8");

function pick(name) {
  const m = env.match(new RegExp(`^${name}="([^"]+)"`, "m"));
  return m?.[1] ?? null;
}

const databaseUrl = (pick("DATABASE_URL_VERCEL") ?? pick("DATABASE_URL"))?.trim();

if (!databaseUrl) {
  console.error("DATABASE_URL_VERCEL or DATABASE_URL not found in .env");
  process.exit(1);
}

console.log("Setting DATABASE_URL for production…");
const r = spawnSync(
  "npx",
  ["vercel", "env", "add", "DATABASE_URL", "production", "--force", "--yes", "--sensitive"],
  { cwd: join(root, "apps/api"), input: databaseUrl, stdio: ["pipe", "inherit", "inherit"], shell: true }
);
if (r.status !== 0) process.exit(r.status ?? 1);

console.log("\nDone. Redeploy: npm run deploy:api");
