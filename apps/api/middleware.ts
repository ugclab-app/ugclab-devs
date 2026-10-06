/** Serve the storefront shell for any page opened with ?tenant=, keeping that URL in the browser. */
export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const tenant = url.searchParams.get("tenant")?.trim();
  const path = url.pathname;
  const isFile = /\.[a-z0-9]+$/i.test(path);
  const isApi =
    path.startsWith("/api/") ||
    path === "/api" ||
    path === "/health" ||
    path.startsWith("/health/");
  if (path === "/platform" || path.startsWith("/platform/")) {
    if (isFile) return;
    const admin = new URL(request.url);
    admin.pathname = "/platform/index.html";
    const res = await fetch(admin, { headers: request.headers, redirect: "manual" });
    const headers = new Headers(res.headers);
    headers.set("cache-control", "private, no-store");
    headers.delete("age");
    return new Response(res.body, { status: res.status, headers });
  }

  if (!tenant || isFile || isApi || path === "/storefront.html") return;

  const target = new URL(request.url);
  target.pathname = "/storefront.html";
  const res = await fetch(target, { headers: request.headers, redirect: "manual" });
  const headers = new Headers(res.headers);
  headers.set("cache-control", "private, no-store");
  headers.delete("age");
  return new Response(res.body, { status: res.status, headers });
}
