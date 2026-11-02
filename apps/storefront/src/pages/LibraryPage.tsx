import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ApiError, storeApi, type LibraryItem } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { productImageUrl } from "@/lib/product-images";
import { storeHref } from "@/lib/store-href";

export function LibraryPage() {
  const ctx = useStore();
  const { tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  const { data, error, isLoading } = useQuery({
    queryKey: ["account-library", tenant],
    queryFn: () => storeApi.library(tenant),
    retry: (count, err) =>
      !(err instanceof ApiError && err.status === 401) && count < 2,
  });

  const unauthorized = error instanceof ApiError && error.status === 401;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Library</h1>
        <Link
          to={storeHref("/account", nav)}
          className="text-sm font-medium text-[var(--store-primary)]"
        >
          ← My account
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Downloads, license keys, and courses from your purchases.
      </p>

      {isLoading ? (
        <p className="mt-8 text-zinc-500">Loading your library…</p>
      ) : unauthorized ? (
        <p className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Sign in to see your purchases.{" "}
          <Link
            to={storeHref("/account/login", nav)}
            className="font-medium text-[var(--store-primary)]"
          >
            Sign in
          </Link>
        </p>
      ) : error ? (
        <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : "Could not load your library"}
        </p>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">
          Nothing here yet. Digital products and courses you buy will appear in your
          Library.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {data.items.map((item) => (
            <LibraryItemCard
              key={`${item.productId}-${item.orderNumber}`}
              item={item}
              tenant={tenant}
              nav={nav}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function LibraryItemCard({
  item,
  tenant,
  nav,
}: {
  item: LibraryItem;
  tenant: string;
  nav: { locale: string; tenant: string };
}) {
  const [open, setOpen] = useState(false);
  const [lessonIndex, setLessonIndex] = useState(0);
  const lessons = item.lessons ?? [];
  const lesson = lessons[lessonIndex] ?? lessons[0];

  return (
    <li className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex gap-4 p-5">
        {item.imageKey ? (
          <img
            src={productImageUrl(item.imageKey)}
            alt=""
            className="h-20 w-20 flex-none rounded-lg object-cover"
          />
        ) : (
          <div className="h-20 w-20 flex-none rounded-lg bg-zinc-100" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link
                to={storeHref(`/products/${item.slug}`, nav)}
                className="font-semibold hover:underline"
              >
                {item.title}
              </Link>
              <p className="text-xs text-zinc-500">
                Order #{item.orderNumber}
                {item.purchasedAt
                  ? ` · ${new Date(item.purchasedAt).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
            {lessons.length > 0 ? (
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
                Course · {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
              </span>
            ) : null}
          </div>

          <div className="mt-3 space-y-2 text-sm">
            {item.download ? (
              <p>
                <a
                  href={`/api/store/download/${encodeURIComponent(item.download.token)}?tenant=${encodeURIComponent(tenant)}`}
                  className="font-medium text-[var(--store-primary)] hover:underline"
                >
                  ↓ {item.download.fileName || "Download file"}
                </a>
                {Number.isFinite(item.download.remaining) ? (
                  <span className="ml-2 text-xs text-zinc-400">
                    {item.download.remaining}{" "}
                    {item.download.remaining === 1 ? "download" : "downloads"} left
                  </span>
                ) : null}
              </p>
            ) : null}
            {item.licenseKey ? (
              <p className="text-zinc-700">
                License key:{" "}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                  {item.licenseKey}
                </code>
              </p>
            ) : null}
            {lessons.length > 0 ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="font-medium text-[var(--store-primary)] hover:underline"
                aria-expanded={open}
              >
                {open ? "Hide lessons" : "View lessons"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {open && lessons.length > 0 ? (
        <div className="grid gap-0 border-t border-zinc-100 md:grid-cols-[16rem_1fr]">
          <ol className="divide-y divide-zinc-100 border-b border-zinc-100 md:border-b-0 md:border-r">
            {lessons.map((l, i) => (
              <li key={`${i}-${l.title}`}>
                <button
                  type="button"
                  onClick={() => setLessonIndex(i)}
                  className={`flex w-full items-start gap-2 px-4 py-3 text-left text-sm ${
                    i === lessonIndex
                      ? "bg-violet-50 font-medium text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <span className="w-5 flex-none text-xs text-zinc-400">{i + 1}.</span>
                  <span className="min-w-0 flex-1">{l.title}</span>
                </button>
              </li>
            ))}
          </ol>
          {lesson ? (
            <div className="p-5">
              <h3 className="font-semibold">{lesson.title}</h3>
              {lesson.embedUrl ? (
                <div className="relative mt-3 w-full overflow-hidden rounded-xl bg-black pt-[56.25%]">
                  <iframe
                    key={lesson.embedUrl}
                    src={lesson.embedUrl}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              ) : lesson.videoUrl ? (
                <p className="mt-3 text-sm">
                  <a
                    href={lesson.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[var(--store-primary)] underline"
                  >
                    Open video
                  </a>
                </p>
              ) : null}
              {lesson.body ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {lesson.body}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
