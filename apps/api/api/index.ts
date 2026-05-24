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

/** Single Vercel entry — avoid src/app.ts and src/index.ts (Vercel Hono auto-detect). */
export default async function handler(req: Request): Promise<Response> {
  try {
    const pathname = requestPath(req);
    if (isApiPath(pathname)) {
      const { app } = await import("../src/hono-app.js");
      return handle(app)(req);
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

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};
