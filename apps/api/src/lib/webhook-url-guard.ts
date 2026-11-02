/** Pure SSRF checks for merchant-supplied webhook URLs. No network access here. */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out = out * 256 + n;
  }
  return out;
}

function inCidr(ip: number, base: string, bits: number): boolean {
  const b = ipv4ToInt(base);
  if (b == null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return ((ip & mask) >>> 0) === ((b & mask) >>> 0);
}

/** RFC1918, loopback, link-local, CGNAT, multicast, reserved, cloud metadata. */
export function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n == null) return false;
  return (
    inCidr(n, "0.0.0.0", 8) ||
    inCidr(n, "10.0.0.0", 8) ||
    inCidr(n, "100.64.0.0", 10) ||
    inCidr(n, "127.0.0.0", 8) ||
    inCidr(n, "169.254.0.0", 16) ||
    inCidr(n, "172.16.0.0", 12) ||
    inCidr(n, "192.0.0.0", 24) ||
    inCidr(n, "192.0.2.0", 24) ||
    inCidr(n, "192.168.0.0", 16) ||
    inCidr(n, "198.18.0.0", 15) ||
    inCidr(n, "198.51.100.0", 24) ||
    inCidr(n, "203.0.113.0", 24) ||
    inCidr(n, "224.0.0.0", 3)
  );
}

export function isPrivateIpv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("fe80:") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb"))
    return true; // link-local fe80::/10
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local fc00::/7
  if (v.startsWith("ff")) return true; // multicast
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  return ip.includes(":") ? isPrivateIpv6(ip) : isPrivateIpv4(ip);
}

export type UrlCheck = { ok: true; hostname: string } | { ok: false; reason: string };

/**
 * Syntactic checks a merchant webhook URL must pass before we even resolve DNS:
 * https only, no credentials, no raw private IPs, no local hostnames.
 */
export function checkWebhookUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "HTTPS URL required" };
  if (url.username || url.password) {
    return { ok: false, reason: "Credentials in URL are not allowed" };
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return { ok: false, reason: "Missing hostname" };
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return { ok: false, reason: "Local or internal hostnames are not allowed" };
  }
  if (!host.includes(".") && !host.startsWith("[")) {
    return { ok: false, reason: "Use a public hostname" };
  }
  const bare = host.replace(/^\[|\]$/g, "");
  if (/^[\d.]+$/.test(bare) || bare.includes(":")) {
    if (isPrivateAddress(bare)) {
      return { ok: false, reason: "Private IP addresses are not allowed" };
    }
  }
  return { ok: true, hostname: bare };
}

/** Backoff schedule in ms for attempt N (1-based): 1m, 5m, 30m, 2h, 12h. */
export const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

export function nextRetryAt(attemptsSoFar: number, now = Date.now()): Date | null {
  if (attemptsSoFar >= MAX_ATTEMPTS) return null;
  const idx = Math.max(0, Math.min(attemptsSoFar - 1, RETRY_DELAYS_MS.length - 1));
  const delay = RETRY_DELAYS_MS[idx] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 60_000;
  return new Date(now + delay);
}
