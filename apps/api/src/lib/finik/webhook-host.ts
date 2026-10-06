/** Host candidates for Finik webhook signature (proxy / Vercel friendly). */

export function normalizeHost(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim() ?? "";
  if (!first) return null;
  // strip port
  const host = first.includes("]")
    ? first // ipv6 unlikely; keep as-is
    : first.split(":")[0]!;
  return host.toLowerCase() || null;
}

export function resolveWebhookHostCandidates(opts: {
  host?: string | null;
  forwardedHost?: string | null;
  originalHost?: string | null;
  publicApiUrl?: string | null;
}): string[] {
  const out: string[] = [];
  const push = (raw: string | undefined | null) => {
    const h = normalizeHost(raw);
    if (h && !out.includes(h)) out.push(h);
  };

  push(opts.forwardedHost);
  push(opts.originalHost);
  push(opts.host);

  if (opts.publicApiUrl) {
    try {
      push(new URL(opts.publicApiUrl).host);
    } catch {
      /* ignore */
    }
  }

  return out;
}
