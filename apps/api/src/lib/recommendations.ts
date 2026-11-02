/** Pure ranking helpers for "similar products" and "frequently bought together". */

export type SimilarCandidate = {
  id: string;
  type: string;
  tags: string[];
  collectionIds: string[];
  priceAmount: number;
  createdAt: Date;
};

const W_COLLECTION = 3;
const W_TAG = 1;
const W_TYPE = 0.5;
const W_PRICE = 1; // bonus when within ±50% of the target price

/** Score each candidate against the target; higher is more similar. Ties broken by newest. */
export function rankSimilar(
  target: SimilarCandidate,
  candidates: SimilarCandidate[],
  limit = 4
): string[] {
  const tagSet = new Set(target.tags.map((t) => t.toLowerCase()));
  const colSet = new Set(target.collectionIds);
  const scored = candidates
    .filter((c) => c.id !== target.id)
    .map((c) => {
      let score = 0;
      for (const id of c.collectionIds) if (colSet.has(id)) score += W_COLLECTION;
      for (const t of c.tags) if (tagSet.has(t.toLowerCase())) score += W_TAG;
      if (c.type === target.type) score += W_TYPE;
      if (
        target.priceAmount > 0 &&
        c.priceAmount >= target.priceAmount * 0.5 &&
        c.priceAmount <= target.priceAmount * 1.5
      ) {
        score += W_PRICE;
      }
      return { id: c.id, score, createdAt: c.createdAt.getTime() };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
  return scored.slice(0, limit).map((s) => s.id);
}

/**
 * Co-purchase counts: for every order that contains the target, count the other
 * products in it. Input is a list of orders as product-id arrays.
 */
export function rankCoPurchases(
  targetId: string,
  orders: string[][],
  limit = 4,
  minSupport = 1
): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const ids = new Set(order);
    if (!ids.has(targetId)) continue;
    for (const id of ids) {
      if (id === targetId) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= minSupport)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}
