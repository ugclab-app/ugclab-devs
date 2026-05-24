import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function publicDir(): string {
  const candidates = [
    join(process.cwd(), "public"),
    join(dirname(fileURLToPath(import.meta.url)), "..", "public"),
    join(process.cwd(), "apps", "api", "public"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "index.html"))) return dir;
  }
  return candidates[0]!;
}

/** Platform landing (Vite build in public/). Lightweight — no Prisma. */
export const landingApp = new Hono();

landingApp.use(
  "/*",
  serveStatic({
    root: publicDir(),
    rewriteRequestPath: (path) => (/\.[a-z0-9]+$/i.test(path) ? path : "/index.html"),
  })
);
