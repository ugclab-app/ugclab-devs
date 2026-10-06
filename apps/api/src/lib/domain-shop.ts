/**
 * Domain search (optional Entri Sell Enterprise) + registrar checkout links.
 */
import { normalizeDomainInput } from "./custom-domain.js";

const ENTRI_TOKEN_URL = "https://api.goentri.com/token";
const ENTRI_SELL_V1 = "https://api.goentri.com/enterprise/sell/v1";

export type DomainSearchResult = {
  domain: string;
  available: boolean | null;
  priceUsd: number | null;
  renewalPriceUsd: number | null;
  source: "entri" | "estimate";
};

export type RegistrarLink = {
  id: string;
  label: string;
  description: string;
  url: string;
};

let cachedEntriToken: { token: string; expiresAt: number } | null = null;

export function isEntriSellConfigured() {
  return Boolean(
    process.env.ENTRI_APPLICATION_ID?.trim() && process.env.ENTRI_CLIENT_SECRET?.trim()
  );
}

export function getDomainShopConfig() {
  return {
    entriConfigured: isEntriSellConfigured(),
    cnameTarget: process.env.STOREFRONT_CNAME_TARGET ?? "cname.tescommerce.com",
    storefrontBaseDomain: process.env.STORE_BASE_DOMAIN ?? "ugclab.store",
    purchaseMode: isEntriSellConfigured() ? "entri" : "registrar_links",
    registrars: registrarBuyLinks("example.com"),
  };
}

/** Preferred registrars shown first in merchant UI. */
export const RECOMMENDED_REGISTRAR_IDS = ["cloudflare", "namecheap"] as const;

export function registrarBuyLinks(domain: string): RegistrarLink[] {
  const host = normalizeDomainInput(domain) || "yourdomain.com";
  const q = encodeURIComponent(host);
  const label = host.includes(".") ? host : `${host}.com`;
  const links: RegistrarLink[] = [
    {
      id: "cloudflare",
      label: "Cloudflare Registrar",
      description: "At-cost pricing, fast DNS — recommended",
      url: `https://dash.cloudflare.com/domainsearch?domain=${encodeURIComponent(label)}`,
    },
    {
      id: "namecheap",
      label: "Namecheap",
      description: "Popular, promos on .com — recommended",
      url: `https://www.namecheap.com/domains/registration/results/?domain=${q}`,
    },
    {
      id: "ionos",
      label: "IONOS",
      description: "EU-friendly, bundles",
      url: `https://www.ionos.com/domains/domain-name-search?domain=${q}`,
    },
    {
      id: "porkbun",
      label: "Porkbun",
      description: "Low renewal prices",
      url: `https://porkbun.com/checkout/search?q=${q}`,
    },
    {
      id: "squarespace",
      label: "Squarespace Domains",
      description: "Simple checkout",
      url: `https://domains.squarespace.com/domain-search?query=${q}`,
    },
  ];
  const order = new Map(RECOMMENDED_REGISTRAR_IDS.map((id, i) => [id, i]));
  return [...links].sort((a, b) => {
    const ai = order.has(a.id as (typeof RECOMMENDED_REGISTRAR_IDS)[number])
      ? order.get(a.id as (typeof RECOMMENDED_REGISTRAR_IDS)[number])!
      : 99;
    const bi = order.has(b.id as (typeof RECOMMENDED_REGISTRAR_IDS)[number])
      ? order.get(b.id as (typeof RECOMMENDED_REGISTRAR_IDS)[number])!
      : 99;
    return ai - bi;
  });
}

async function getEntriAuthToken(): Promise<string> {
  const applicationId = process.env.ENTRI_APPLICATION_ID!.trim();
  const secret = process.env.ENTRI_CLIENT_SECRET!.trim();
  const now = Date.now();
  if (cachedEntriToken && cachedEntriToken.expiresAt > now + 60_000) {
    return cachedEntriToken.token;
  }
  const res = await fetch(ENTRI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ applicationId, secret }),
  });
  if (!res.ok) {
    throw new Error(`Entri auth failed: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { auth_token?: string };
  if (!data.auth_token) throw new Error("Entri auth: no token");
  cachedEntriToken = {
    token: data.auth_token,
    expiresAt: now + 55 * 60 * 1000,
  };
  return data.auth_token;
}

async function entriFetch(path: string, query?: Record<string, string>) {
  const applicationId = process.env.ENTRI_APPLICATION_ID!.trim();
  const token = await getEntriAuthToken();
  const qs = query
    ? `?${new URLSearchParams(query).toString()}`
    : "";
  const res = await fetch(`${ENTRI_SELL_V1}${path}${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      applicationId,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 300) || res.statusText);
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

function parseAvailability(
  domain: string,
  data: Record<string, unknown>
): DomainSearchResult {
  const availability = String(data.availability ?? "").toUpperCase();
  const available =
    availability === "AVAILABLE"
      ? true
      : availability === "UNAVAILABLE" || availability === "TAKEN"
        ? false
        : null;
  return {
    domain: String(data.domain ?? domain),
    available,
    priceUsd: typeof data.price === "number" ? data.price : null,
    renewalPriceUsd:
      typeof data.renewalPrice === "number" ? data.renewalPrice : null,
    source: "entri",
  };
}

export async function searchDomains(query: string): Promise<{
  query: string;
  entri: boolean;
  results: DomainSearchResult[];
  registrars: RegistrarLink[];
}> {
  const base = normalizeDomainInput(query);
  if (!base) {
    return { query: "", entri: false, results: [], registrars: registrarBuyLinks("") };
  }

  const registrars = registrarBuyLinks(base);
  const entri = isEntriSellConfigured();
  const results: DomainSearchResult[] = [];

  if (entri) {
    try {
      const primary = base.includes(".") ? base : `${base}.com`;
      const avail = await entriFetch("/domains/availability", {
        domainName: primary,
      });
      results.push(parseAvailability(primary, avail));

      const stem = primary.split(".")[0] ?? base;
      const sug = (await entriFetch("/domains/suggestions", {
        domain: stem,
        tlds: "com,store,shop,online",
      })) as { suggestions?: Array<Record<string, unknown>> };
      for (const s of sug.suggestions ?? []) {
        const d = String(s.domain ?? "").toLowerCase();
        if (!d || results.some((r) => r.domain === d)) continue;
        results.push({
          domain: d,
          available: true,
          priceUsd: typeof s.price === "number" ? s.price : null,
          renewalPriceUsd:
            typeof s.renewalPrice === "number" ? s.renewalPrice : null,
          source: "entri",
        });
      }
    } catch (e) {
      console.warn("[domain-shop] Entri search", e);
    }
  }

  if (results.length === 0) {
    const candidates = base.includes(".")
      ? [base]
      : [`${base}.com`, `${base}.store`, `${base}.shop`];
    for (const d of candidates) {
      results.push({
        domain: d,
        available: null,
        priceUsd: null,
        renewalPriceUsd: null,
        source: "estimate",
      });
    }
  }

  return { query: base, entri, results, registrars };
}

/** External checkout: registrar links (variant 1). Entri direct order = future. */
export function getPurchaseLinksForDomain(domain: string) {
  const host = normalizeDomainInput(domain);
  return {
    domain: host,
    mode: isEntriSellConfigured() ? ("entri_plus_registrars" as const) : ("registrar_links" as const),
    registrars: registrarBuyLinks(host),
    note: isEntriSellConfigured()
      ? "Complete purchase at a registrar below, then connect the domain in the Connect tab."
      : "Add ENTRI_APPLICATION_ID and ENTRI_CLIENT_SECRET for live availability checks.",
  };
}
