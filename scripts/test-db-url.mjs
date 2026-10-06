import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const env = readFileSync(resolve(root, ".env"), "utf8");
const m = env.match(/^DATABASE_URL_VERCEL="([^"]+)"/m);
const url = m?.[1] ?? process.env.DATABASE_URL;
if (!url) {
  console.error("No URL");
  process.exit(1);
}

const t0 = Date.now();
const prisma = new PrismaClient({ datasources: { db: { url } } });
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("OK", Date.now() - t0, "ms (6543 pooler)");
} catch (e) {
  console.error("FAIL", Date.now() - t0, "ms", e.message?.slice(0, 200));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
