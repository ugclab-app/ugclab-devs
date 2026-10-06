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
  return {
    txtHost: host,
    txtValue: token,
    cnameHost: host.startsWith("www.") ? host : `www.${host}`,
    cnameTarget: process.env.STOREFRONT_CNAME_TARGET ?? "cname.tescommerce.com",
    note: "Add a TXT record at the domain root (or _ugclab subdomain) with the verification value. Point www CNAME to your storefront host per Vercel/custom host docs.",
  };
}
