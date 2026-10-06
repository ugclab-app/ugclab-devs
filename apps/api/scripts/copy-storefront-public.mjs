import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(apiRoot, "..", "storefront", "dist");
const target = join(apiRoot, "public");

if (!existsSync(dist)) {
  console.error("Storefront build missing:", dist);
  process.exit(1);
}

const skip = new Set([
  "index.html",
  "sw.js",
  "registerSW.js",
  "manifest.webmanifest",
]);

for (const name of readdirSync(dist)) {
  if (skip.has(name) || name.startsWith("workbox-")) continue;
  cpSync(join(dist, name), join(target, name), { recursive: true });
}

let html = readFileSync(join(dist, "index.html"), "utf8");
html = html
  .replace(/<script[^>]*registerSW\.js[^>]*><\/script>/g, "")
  .replace(/<link[^>]*manifest\.webmanifest[^>]*>/g, "");
writeFileSync(join(target, "storefront.html"), `<!-- storefront -->\n${html}`);
console.log("Copied storefront dist → apps/api/public/storefront.html");
