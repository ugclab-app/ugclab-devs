/**
 * Live FX rates for display currencies and market checkout currencies.
 * A snapshot (units per 1 USD) is refreshed every 12h, stored in PlatformSetting,
 * and loaded into @ugclab/i18n/store-currency on each API instance.
 * If the feed is down, the last stored snapshot (or the built-in fallback) stays active.
 */
import { prisma } from "@ugclab/database";
import { SUPPORTED_CURRENCIES, setFxRates } from "@ugclab/i18n/store-currency";

const SETTING_KEY = "fxRates";
const SOURCE_URL = "https://open.er-api.com/v6/latest/USD";
const SOURCE_NAME = "ExchangeRate-API (open.er-api.com)";
/** How often an API instance re-reads the stored snapshot. */
const RELOAD_MS = 10 * 60 * 1000;
/** Cron refreshes the snapshot once it is older than this. */
const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000;

export type FxSnapshot = {
  rates: Record<string, number>;
  fetchedAt: string;
  source: string;
};

let loadedAt = 0;
let loading: Promise<void> | null = null;

function parseSnapshot(raw: unknown): FxSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!o.rates || typeof o.rates !== "object" || typeof o.fetchedAt !== "string") return null;
  return {
    rates: o.rates as Record<string, number>,
    fetchedAt: o.fetchedAt,
    source: typeof o.source === "string" ? o.source : SOURCE_NAME,
  };
}

export async function getFxSnapshot(): Promise<FxSnapshot | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key: SETTING_KEY } });
  return parseSnapshot(row?.value);
}

/**
 * Load the stored snapshot into memory (at most every RELOAD_MS) and refresh it from the feed
 * when it is stale — cron does not run on Vercel, so requests keep the rates current. Never throws.
 */
export async function ensureFxRates(): Promise<void> {
  if (Date.now() - loadedAt < RELOAD_MS) return;
  if (!loading) {
    loading = (async () => {
      try {
        const snap = await getFxSnapshot();
        if (snap) setFxRates(snap.rates);
        const age = snap ? Date.now() - Date.parse(snap.fetchedAt) : Infinity;
        if (age >= REFRESH_AFTER_MS) await refreshFxRates();
      } catch (e) {
        console.error("[fx] load snapshot", e);
      } finally {
        loadedAt = Date.now();
        loading = null;
      }
    })();
  }
  await loading;
}

/** Fetch fresh rates from the feed, store and apply them. */
export async function refreshFxRates(): Promise<FxSnapshot> {
  const res = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`FX feed HTTP ${res.status}`);
  const json = (await res.json()) as { result?: string; rates?: Record<string, unknown> };
  if (json.result !== "success" || !json.rates) throw new Error("FX feed returned no rates");
  const picked: Record<string, number> = {};
  for (const code of SUPPORTED_CURRENCIES) {
    const r = json.rates[code];
    if (typeof r === "number" && Number.isFinite(r) && r > 0) picked[code] = r;
  }
  // setFxRates drops out-of-range values, so store what was actually applied
  const applied = setFxRates(picked);
  const snap: FxSnapshot = {
    rates: applied,
    fetchedAt: new Date().toISOString(),
    source: SOURCE_NAME,
  };
  await prisma.platformSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: snap as object },
    update: { value: snap as object },
  });
  loadedAt = Date.now();
  return snap;
}

/** Cron entry: refresh when the stored snapshot is missing or older than REFRESH_AFTER_MS. */
export async function refreshFxRatesIfStale(): Promise<{ refreshed: boolean }> {
  const snap = await getFxSnapshot();
  const age = snap ? Date.now() - Date.parse(snap.fetchedAt) : Infinity;
  if (age < REFRESH_AFTER_MS) return { refreshed: false };
  await refreshFxRates();
  return { refreshed: true };
}
