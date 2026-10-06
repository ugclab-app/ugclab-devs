import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(apiRoot, "..", "platform-admin", "dist");
const target = join(apiRoot, "public", "platform");

if (!existsSync(dist)) {
  console.error("Platform admin build missing:", dist);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(dist, target, { recursive: true });
console.log("Copied platform admin dist → apps/api/public/platform");
