const KEY_PREFIX = "ugclab-onboard-store-url:";

export function isStoreUrlStepDone(tenantSlug: string): boolean {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${tenantSlug}`) === "1";
  } catch {
    return false;
  }
}

export function markStoreUrlStepDone(tenantSlug: string): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${tenantSlug}`, "1");
  } catch {
    /* ignore */
  }
}
