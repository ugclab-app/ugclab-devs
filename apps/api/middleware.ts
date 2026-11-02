const PLATFORM_HOSTS = new Set([
  "tescommerce.com",
  "www.tescommerce.com",
  "localhost",
  "127.0.0.1",
]);

function requestHost(request: Request): string {
  const raw =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  return raw.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

function publicUrl(request: Request): URL {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host) url.host = host;
  if (proto === "http" || proto === "https") url.protocol = `${proto}:`;
  return url;
}

/** Merchant domains attached to this project should open the shop, not the marketing site. */
function isCustomStoreHost(host: string): boolean {
  if (!host || PLATFORM_HOSTS.has(host)) return false;
  if (host.endsWith(".vercel.app")) return false;
  if (host === "tescommerce.com" || host.endsWith(".tescommerce.com")) return false;
  return true;
}

async function storefrontShell(request: Request): Promise<Response> {
  const target = new URL(request.url);
  target.pathname = "/storefront.html";
  target.search = "";
  const res = await fetch(target, { headers: request.headers, redirect: "manual" });
  const headers = new Headers(res.headers);
  headers.set("cache-control", "private, no-store");
  headers.delete("age");
  return new Response(res.body, { status: res.status, headers });
}

/** Serve the storefront shell for ?tenant= and for a merchant's own domain. */
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

  if (isFile || isApi || path === "/storefront.html") return;

  const host = requestHost(request);
  if (isCustomStoreHost(host) && !tenant) {
    try {
      const lookup = new URL(request.url);
      lookup.pathname = "/api/store/resolve-host";
      lookup.search = `?host=${encodeURIComponent(host)}`;
      const found = await fetch(lookup, { headers: { accept: "application/json" } });
      if (found.ok) {
        const data = (await found.json()) as { slug?: string };
        if (data.slug) {
          const dest = publicUrl(request);
          dest.searchParams.set("tenant", data.slug);
          if (!dest.searchParams.get("locale")) dest.searchParams.set("locale", "en");
          return Response.redirect(dest.toString(), 307);
        }
      }
    } catch {
      /* fall through to the storefront shell */
    }
    return storefrontShell(request);
  }

  if (!tenant) return;

  return storefrontShell(request);
}
