import { prisma } from "@ugclab/database";

export type StoreReviewRow = {
  id: string;
  authorName: string;
  rating: number;
  body: string | null;
  photoUrls: string[];
  verifiedPurchase: boolean;
  pinned: boolean;
  helpfulCount: number;
  merchantReply: string | null;
  merchantRepliedAt: Date | null;
  createdAt: Date;
  product: { title: string; slug: string } | null;
};

export async function fetchStoreReviews(
  tenantId: string,
  opts: {
    limit?: number;
    minRating?: number;
    sort?: "newest" | "rating";
    pinnedIds?: string[];
  } = {},
): Promise<StoreReviewRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 6, 1), 20);
  const minRating = opts.minRating && opts.minRating > 0 ? opts.minRating : undefined;
  const sort = opts.sort === "rating" ? "rating" : "newest";
  const pinnedIds = (opts.pinnedIds ?? []).filter(Boolean).slice(0, 10);

  const baseWhere = {
    tenantId,
    approved: true,
    ...(minRating ? { rating: { gte: minRating } } : {}),
  };

  const select = {
    id: true,
    authorName: true,
    rating: true,
    body: true,
    photoUrls: true,
    verifiedPurchase: true,
    pinned: true,
    helpfulCount: true,
    merchantReply: true,
    merchantRepliedAt: true,
    createdAt: true,
    product: { select: { title: true, slug: true } },
  } as const;

  const orderBy =
    sort === "rating"
      ? [{ rating: "desc" as const }, { createdAt: "desc" as const }]
      : [{ pinned: "desc" as const }, { createdAt: "desc" as const }];

  let pinned: StoreReviewRow[] = [];
  if (pinnedIds.length > 0) {
    pinned = await prisma.productReview.findMany({
      where: { ...baseWhere, id: { in: pinnedIds } },
      select,
    });
    const order = new Map(pinnedIds.map((id, i) => [id, i]));
    pinned.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  }

  const remaining = Math.max(0, limit - pinned.length);
  const rest =
    remaining > 0
      ? await prisma.productReview.findMany({
          where: {
            ...baseWhere,
            ...(pinnedIds.length ? { id: { notIn: pinnedIds } } : {}),
          },
          orderBy,
          take: remaining,
          select,
        })
      : [];

  return [...pinned, ...rest].slice(0, limit);
}

export function reviewsAggregate(reviews: Pick<StoreReviewRow, "rating">[]) {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return {
    ratingValue: Math.round((sum / reviews.length) * 10) / 10,
    reviewCount: reviews.length,
  };
}
