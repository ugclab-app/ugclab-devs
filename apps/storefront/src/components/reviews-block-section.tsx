import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { titleSizeClass } from "@ugclab/tenant/block-style";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { storeApi } from "@/api/client";
import { HomeBlockShell } from "@/components/home-block-shell";
import { storeHref } from "@/lib/store-href";

export type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  body: string | null;
  photoUrls?: string[];
  verifiedPurchase?: boolean;
  pinned?: boolean;
  merchantReply?: string | null;
  product?: { title: string; slug: string } | null;
};

function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function resolveReviewsVariant(block: HomeBlock): string {
  if (block.designVariantId?.startsWith("reviews-")) return block.designVariantId;
  if (block.align === "center" && block.reviewShowAggregate) return "reviews-trust";
  if (block.align === "center") return "reviews-centered";
  return "reviews-grid";
}

function ReviewCard({
  review,
  nav,
  compact,
}: {
  review: ReviewItem;
  nav: { locale: string; tenant: string };
  compact?: boolean;
}) {
  const photo = review.photoUrls?.[0];
  return (
    <li
      className={`rounded-xl border border-zinc-200 bg-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start gap-3">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium text-zinc-900">{review.authorName}</p>
            {review.verifiedPurchase ? (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                Unverified
              </span>
            )}
          </div>
          <p className="text-amber-500 text-sm" aria-label={`${review.rating} stars`}>
            {stars(review.rating)}
          </p>
        </div>
      </div>
      {review.body ? (
        <p className={`mt-2 text-zinc-600 ${compact ? "text-xs" : "text-sm"}`}>{review.body}</p>
      ) : null}
      {review.merchantReply ? (
        <p className={`mt-2 border-l-2 border-violet-200 pl-2 text-zinc-500 ${compact ? "text-[11px]" : "text-xs"}`}>
          Store: {review.merchantReply}
        </p>
      ) : null}
      {review.product?.slug ? (
        <Link
          to={storeHref(`/products/${review.product.slug}`, nav)}
          className="mt-2 inline-block text-xs text-violet-600 hover:underline"
        >
          {review.product.title}
        </Link>
      ) : review.product?.title ? (
        <p className="mt-2 text-xs text-zinc-400">— {review.product.title}</p>
      ) : null}
    </li>
  );
}

function AggregateHeader({
  reviews,
  title,
  block,
}: {
  reviews: ReviewItem[];
  title?: string;
  block: HomeBlock;
}) {
  const avg =
    reviews.length > 0
      ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
  return (
    <div className={block.align === "center" ? "text-center" : ""}>
      {title ? (
        <h2 className={titleSizeClass(block.titleSize)}>{title}</h2>
      ) : null}
      {block.reviewShowAggregate && reviews.length > 0 ? (
        <p className="mt-2 text-lg font-semibold text-amber-500">
          {stars(Math.round(avg))}{" "}
          <span className="text-base font-normal text-zinc-600">
            {avg} · {reviews.length} reviews
          </span>
        </p>
      ) : null}
    </div>
  );
}

function ReviewsSchema({ reviews }: { reviews: ReviewItem[] }) {
  const json = useMemo(() => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((a, r) => a + r.rating, 0);
    const avg = Math.round((sum / reviews.length) * 10) / 10;
    return {
      "@context": "https://schema.org",
      "@type": "AggregateRating",
      ratingValue: avg,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
  }, [reviews]);
  if (!json) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export function ReviewsBlockSection({
  block,
  tenant,
  nav,
  reviews: reviewsOverride,
  loading: loadingOverride,
}: {
  block: HomeBlock;
  tenant: string;
  nav: { locale: string; tenant: string };
  reviews?: ReviewItem[];
  loading?: boolean;
}) {
  const limit = block.reviewLimit ?? 6;
  const minRating = block.reviewMinRating ?? 0;
  const sort = block.reviewSort ?? "newest";
  const pinned = block.reviewPinnedIds?.join(",") ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["store-reviews", tenant, limit, minRating, sort, pinned],
    queryFn: () =>
      storeApi.storeReviews(tenant, {
        limit: String(limit),
        minRating: minRating > 0 ? String(minRating) : undefined,
        sort,
        pinned: pinned || undefined,
      }),
    enabled: reviewsOverride === undefined,
  });

  const reviews = reviewsOverride ?? data?.reviews ?? [];
  const loading = loadingOverride ?? isLoading;
  const variant = resolveReviewsVariant(block);
  const title = block.title;
  const embed = block.externalReviewsEmbedUrl?.trim();
  const showEmpty = block.reviewShowWhenEmpty !== false;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoplay =
    variant === "reviews-carousel" && (block.carouselAutoplay ?? true);
  const intervalSec = block.carouselIntervalSec ?? 5;

  useEffect(() => {
    if (!autoplay || reviews.length < 2 || !scrollerRef.current) return;
    const el = scrollerRef.current;
    const step = () => {
      const w = el.clientWidth * 0.9;
      const max = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: w, behavior: "smooth" });
    };
    const id = window.setInterval(step, intervalSec * 1000);
    return () => window.clearInterval(id);
  }, [autoplay, intervalSec, reviews.length]);

  if (loading) {
    return (
      <HomeBlockShell block={block}>
        <p className="text-sm text-zinc-500">Loading reviews…</p>
      </HomeBlockShell>
    );
  }

  if (reviews.length === 0) {
    if (!showEmpty) return null;
    return (
      <HomeBlockShell block={block}>
        {title ? (
          <h2 className={`${titleSizeClass(block.titleSize)} mb-4`}>{title}</h2>
        ) : null}
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          No approved reviews yet. Customers can leave reviews on product pages — approve them
          under Reviews in your admin.
        </p>
      </HomeBlockShell>
    );
  }

  return (
    <HomeBlockShell block={block}>
      <ReviewsSchema reviews={reviews} />
      {embed ? (
        <div className="mb-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <iframe
            title="External reviews"
            src={embed}
            className="h-[280px] w-full border-0"
            loading="lazy"
          />
        </div>
      ) : null}

      {variant === "reviews-quote" ? (
        <div className={block.align === "center" ? "text-center" : ""}>
          <AggregateHeader reviews={reviews} title={title} block={block} />
          <blockquote className="mx-auto mt-8 max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-amber-500 text-lg">{stars(reviews[0]!.rating)}</p>
            {reviews[0]!.body ? (
              <p className="mt-4 text-xl font-medium text-zinc-800">&ldquo;{reviews[0]!.body}&rdquo;</p>
            ) : null}
            <footer className="mt-4 text-sm text-zinc-500">— {reviews[0]!.authorName}</footer>
          </blockquote>
        </div>
      ) : variant === "reviews-trust" ? (
        <div className="text-center">
          <AggregateHeader reviews={reviews} title={title} block={block} />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            <span className="text-3xl font-bold text-zinc-300">★</span>
          </div>
          <ul className="mx-auto mt-4 grid max-w-4xl gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <ReviewCard key={r.id} review={r} nav={nav} compact />
            ))}
          </ul>
        </div>
      ) : variant === "reviews-avatars" ? (
        <>
          <AggregateHeader reviews={reviews} title={title} block={block} />
          <ul className="mt-8 grid gap-6 sm:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-col items-center text-center">
                <span
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "var(--store-primary, #7c3aed)" }}
                >
                  {initials(r.authorName)}
                </span>
                <p className="text-amber-500 text-sm">{stars(r.rating)}</p>
                {r.body ? (
                  <p className="mt-2 text-sm text-zinc-600 line-clamp-4">{r.body}</p>
                ) : null}
                <p className="mt-2 text-xs font-medium text-zinc-900">{r.authorName}</p>
              </li>
            ))}
          </ul>
        </>
      ) : variant === "reviews-carousel" ? (
        <>
          <AggregateHeader reviews={reviews} title={title} block={block} />
          <div
            ref={scrollerRef}
            className="mt-6 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth"
          >
            {reviews.map((r) => (
              <div key={r.id} className="w-[min(100%,320px)] shrink-0 snap-center">
                <ul>
                  <ReviewCard review={r} nav={nav} />
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <AggregateHeader reviews={reviews} title={title} block={block} />
          <ul
            className={`mt-8 grid gap-4 ${
              block.align === "center" || reviews.length === 1
                ? "mx-auto max-w-xl justify-items-stretch sm:grid-cols-1"
                : "sm:grid-cols-2"
            }`}
          >
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} nav={nav} />
            ))}
          </ul>
        </>
      )}
    </HomeBlockShell>
  );
}
