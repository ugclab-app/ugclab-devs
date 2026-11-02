import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import App from "@/App";
import { headTags, prerenderPaths, resolveMeta, sitemapXml } from "@/landing/seo";

/** Used by scripts/prerender.mjs after `vite build --ssr`. */
export function render(url: string): { html: string; head: string; lang: string } {
  const meta = resolveMeta(url);
  if (!meta) throw new Error(`No landing meta for ${url}`);
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>
  );
  return { html, head: headTags(meta), lang: meta.locale };
}

export { prerenderPaths, sitemapXml };
