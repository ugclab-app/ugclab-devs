import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "..", "platform", "dist");
const target = join(root, "public");

if (!existsSync(dist)) {
  console.error("Platform build missing:", dist);
  process.exit(1);
}

if (!existsSync(target)) {
  cpSync(dist, target, { recursive: true });
} else {
  for (const name of readdirSync(target)) {
    if (name === ".gitkeep") continue;
    rmSync(join(target, name), { recursive: true, force: true });
  }
  for (const name of readdirSync(dist)) {
    cpSync(join(dist, name), join(target, name), { recursive: true });
  }
}

console.log("Copied platform dist → apps/api/public");
