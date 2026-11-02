/**
 * Renders landing pages to static HTML after `vite build` + `vite build --ssr`.
 * dist/index.html becomes the prerendered home page; dist/app.html keeps the empty
 * SPA shell for client-only routes (/signup, /partners, ...).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(appRoot, "dist");
const ssrDir = join(appRoot, "dist-ssr");
const SITE_URL = "https://tescommerce.com";

const template = readFileSync(join(dist, "index.html"), "utf8");
writeFileSync(join(dist, "app.html"), template);

const { render, prerenderPaths, sitemapXml } = await import(
  pathToFileURL(join(ssrDir, "entry-server.js")).href
);

for (const url of prerenderPaths) {
  const { html, head, lang } = render(url);
  const page = template
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/, "")
    .replace("</head>", `  ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  const file = url === "/" ? join(dist, "index.html") : join(dist, url.slice(1), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page);
  console.log(`prerendered ${url}`);
}

writeFileSync(join(dist, "sitemap.xml"), sitemapXml());
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
rmSync(ssrDir, { recursive: true, force: true });
