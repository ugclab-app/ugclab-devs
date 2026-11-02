const STORAGE_KEY = "tescommerce_ref";
/** Matches the 30-day partner attribution window. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredRef = { code: string; at: number };

export function rememberPartnerRef(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, at: Date.now() } satisfies StoredRef));
  } catch {
    /* storage blocked — the URL param still works on this page */
  }
}

/** `?ref=` on the current URL wins; otherwise the last remembered code within 30 days. */
export function currentPartnerRef(): string | undefined {
  const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim();
  if (fromUrl) return fromUrl;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const stored = JSON.parse(raw) as StoredRef;
    if (!stored.code || Date.now() - stored.at > TTL_MS) return undefined;
    return stored.code;
  } catch {
    return undefined;
  }
}
