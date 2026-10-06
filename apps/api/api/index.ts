import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handle } from "hono/vercel";

function requestPath(req: Request): string {
  const raw = req.url;
  try {
    return new URL(raw).pathname;
  } catch {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return new URL(raw.startsWith("/") ? raw : `/${raw}`, `${proto}://${host}`).pathname;
  }
}

function isApiPath(pathname: string): boolean {
  return pathname === "/health" || pathname.startsWith("/api/");
}

function storefrontHtmlPath(): string | null {
  const candidates = [
    join(process.cwd(), "public", "storefront.html"),
    join(dirname(fileURLToPath(import.meta.url)), "..", "public", "storefront.html"),
    join(process.cwd(), "apps", "api", "public", "storefront.html"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function requestUrl(req: Request): URL | null {
  try {
    return new URL(req.url);
  } catch {
    return null;
  }
}

/** Single Vercel entry — avoid src/app.ts and src/index.ts (Vercel Hono auto-detect).
 * Named methods are required: a default export is treated as Node (req, res) and the returned Response is dropped. */
async function handler(req: Request): Promise<Response> {
  try {
    const pathname = requestPath(req);
    if (isApiPath(pathname)) {
      const { app } = await import("../src/hono-app.js");
      return handle(app)(req);
    }
    const url = requestUrl(req);
    const tenant = url?.searchParams.get("tenant")?.trim();
    const isFile = /\.[a-z0-9]+$/i.test(pathname);
    if (tenant && !isFile) {
      const htmlPath = storefrontHtmlPath();
      if (htmlPath) {
        return new Response(readFileSync(htmlPath), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
    }
    const { landingApp } = await import("../src/landing-app.js");
    return handle(landingApp)(req);
  } catch (err) {
    console.error("[api] handler failed:", err);
    return Response.json(
      {
        error: "Internal server error",
        hint: "Check Vercel function logs for @ugclab/api",
      },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};
