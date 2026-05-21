const MAX = 12;

export function getRecentKey(tenantId: string) {
  return `ugclab_recent_${tenantId}`;
}

export function readRecentProductIds(tenantId: string): string[] {
  try {
    const raw = localStorage.getItem(getRecentKey(tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function trackRecentProduct(tenantId: string, productId: string) {
  const prev = readRecentProductIds(tenantId).filter((id) => id !== productId);
  const next = [productId, ...prev].slice(0, MAX);
  localStorage.setItem(getRecentKey(tenantId), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("ugclab-recent-updated"));
}
