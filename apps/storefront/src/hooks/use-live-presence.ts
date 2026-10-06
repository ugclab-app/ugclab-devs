import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

const SESSION_KEY = "ugclab_live_sid";
const UTM_KEY = "ugclab_utm";

function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

function captureUtm(search: string) {
  try {
    const p = new URLSearchParams(search);
    const utmSource = p.get("utm_source")?.trim();
    const utmMedium = p.get("utm_medium")?.trim();
    const utmCampaign = p.get("utm_campaign")?.trim();
    if (!utmSource && !utmMedium && !utmCampaign) {
      const raw = sessionStorage.getItem(UTM_KEY);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    }
    const next = {
      utmSource: utmSource || undefined,
      utmMedium: utmMedium || undefined,
      utmCampaign: utmCampaign || undefined,
    };
    sessionStorage.setItem(UTM_KEY, JSON.stringify(next));
    return next;
  } catch {
    return {};
  }
}

export function getStoredAttribution(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  sessionId?: string;
  landingPath?: string;
} {
  try {
    const utm = JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}") as Record<
      string,
      string
    >;
    return {
      ...utm,
      sessionId: localStorage.getItem(SESSION_KEY) ?? undefined,
      landingPath: sessionStorage.getItem("ugclab_landing") ?? undefined,
    };
  } catch {
    return {};
  }
}

function stageFromPath(pathname: string): "browse" | "cart" | "checkout" {
  if (pathname.includes("/checkout")) return "checkout";
  if (pathname.includes("/cart")) return "cart";
  return "browse";
}

function countryFromLocale(locale: string): string | undefined {
  const l = locale.toLowerCase();
  if (l.startsWith("ru")) return "RU";
  if (l.startsWith("ky") || l.startsWith("kg")) return "KG";
  if (l.startsWith("kk")) return "KZ";
  if (l.startsWith("uz")) return "UZ";
  if (l.startsWith("tr")) return "TR";
  if (l.startsWith("de")) return "DE";
  if (l.startsWith("fr")) return "FR";
  if (l.startsWith("en")) return undefined;
  return undefined;
}

/** Heartbeat so merchant Live View can show visitors right now. */
export function useLivePresence() {
  const { tenant, locale } = useStoreParams();
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!tenant) return;
    const sessionId = getSessionId();
    try {
      if (!sessionStorage.getItem("ugclab_landing")) {
        sessionStorage.setItem("ugclab_landing", pathname + search);
      }
    } catch {
      /* ignore */
    }
    const utm = captureUtm(search);
    const ping = () => {
      void storeApi
        .livePing(tenant, {
          sessionId,
          path: pathname,
          stage: stageFromPath(pathname),
          country: countryFromLocale(locale),
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
          ...utm,
        })
        .catch(() => {});
    };
    ping();
    const t = window.setInterval(ping, 45_000);
    return () => window.clearInterval(t);
  }, [tenant, locale, pathname, search]);
}
