/** Internal links keep tenant + locale (required for local dev). */
export function storeHref(
  path: string,
  params: { locale: string; tenant: string; currency?: string; country?: string }
): string {
  const base = path.startsWith("/") ? path : `/${path}`;
  const q = new URLSearchParams();
  q.set("tenant", params.tenant);
  q.set("locale", params.locale);
  const current =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const currency = params.currency ?? current?.get("currency") ?? undefined;
  const country = params.country ?? current?.get("country") ?? undefined;
  if (currency) q.set("currency", currency);
  if (country) q.set("country", country);
  return `${base}?${q.toString()}`;
}
