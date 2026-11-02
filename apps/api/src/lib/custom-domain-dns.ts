import { resolveTxt } from "node:dns/promises";
import { normalizeDomainInput } from "./custom-domain.js";

export async function checkTxtVerification(
  domain: string,
  expectedToken: string
): Promise<{ ok: boolean; records: string[]; error?: string }> {
  const host = normalizeDomainInput(domain);
  const token = expectedToken.trim();
  if (!host || !token) {
    return { ok: false, records: [], error: "Invalid domain or token" };
  }

  const hosts = [host, `_ugclab.${host}`];
  const found: string[] = [];

  for (const h of hosts) {
    try {
      const rows = await resolveTxt(h);
      for (const row of rows) {
        for (const part of row) {
          found.push(part);
        }
      }
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOTFOUND" || code === "ENODATA") continue;
      return {
        ok: false,
        records: found,
        error: code === "ETIMEOUT" ? "DNS lookup timed out" : String(e),
      };
    }
  }

  const ok = found.some(
    (r) => r === token || r.includes(token) || r.replace(/^"|"$/g, "") === token
  );
  return { ok, records: [...new Set(found)] };
}

export function dnsInstructions(domain: string, token: string) {
  const host = normalizeDomainInput(domain);
  const apex = host.startsWith("www.") ? host.slice(4) : host;
  const apexLike = apex.split(".").length === 2;
  return {
    txtHost: host.startsWith("www.") ? apex : host,
    txtValue: token,
    cnameHost: host.startsWith("www.") ? host : apexLike ? `www.${apex}` : host,
    apexHost: apexLike ? "@" : undefined,
    cnameTarget: process.env.STOREFRONT_CNAME_TARGET ?? "cname.tescommerce.com",
    note: apexLike
      ? "Add two CNAME records, both pointing at the target below: host @ and host www. In Cloudflare turn the proxy off (DNS only, grey cloud). Add the TXT record, then click Check DNS. The certificate appears a few minutes after the check succeeds."
      : "Point this host's CNAME at the target below. In Cloudflare turn the proxy off (DNS only). Add the TXT record, then click Check DNS.",
  };
}
