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

const root = publicDir();

/** Prerendered landing pages live at `<path>/index.html`; other routes get the empty SPA shell. */
function htmlFor(path: string): string {
  const clean = path.replace(/\/+$/, "");
  if (!clean) return "/index.html";
  if (existsSync(join(root, clean, "index.html"))) return `${clean}/index.html`;
  return existsSync(join(root, "app.html")) ? "/app.html" : "/index.html";
}

landingApp.use(
  "/*",
  serveStatic({
    root,
    rewriteRequestPath: (path) => (/\.[a-z0-9]+$/i.test(path) ? path : htmlFor(path)),
  })
);
