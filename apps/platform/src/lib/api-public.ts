/** Public API base (production: https://tescommerce.com). Empty = same-origin /api. */
export function publicApiBase(): string {
  const raw = import.meta.env.VITE_API_PUBLIC_URL?.trim() ?? "";
  return raw.replace(/\/$/, "");
}

export function publicSignupUrl(): string {
  const base = publicApiBase();
  return base ? `${base}/api/public/signup` : "/api/public/signup";
}

export function publicPartnerUrl(path: string): string {
  const base = publicApiBase();
  return base ? `${base}/api/public${path}` : `/api/public${path}`;
}
