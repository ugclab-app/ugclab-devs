/** Internal links keep tenant + locale (required for local dev). */
export function storeHref(
  path: string,
  params: { locale: string; tenant: string }
): string {
  const base = path.startsWith("/") ? path : `/${path}`;
  const q = new URLSearchParams();
  q.set("tenant", params.tenant);
  q.set("locale", params.locale);
  return `${base}?${q.toString()}`;
}
