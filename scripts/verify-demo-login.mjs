/**
 * Run: node scripts/verify-demo-login.mjs
 * Checks demo user exists and password matches.
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { compare, hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const prisma = new PrismaClient();
const email = "demo@ugclab.store";
const password = "demo1234";

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("FAIL: User not found. Run: npm run db:push && npm run db:seed");
    process.exit(1);
  }
  if (!user.passwordHash) {
    console.error("FAIL: User has no password. Run: npm run db:seed");
    process.exit(1);
  }
  const ok = await compare(password, user.passwordHash);
  if (!ok) {
    console.error("FAIL: Password mismatch. Run: npm run db:seed");
    process.exit(1);
  }
  console.log("OK: demo@ugclab.store / demo1234 is valid");
  console.log("   AUTH_SECRET set:", Boolean(process.env.AUTH_SECRET));
} catch (e) {
  console.error("FAIL:", e.message);
  console.error("Is PostgreSQL running? docker compose up -d");
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
