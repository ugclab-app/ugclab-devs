import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { titleSizeClass } from "@ugclab/tenant/block-style";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { storeApi } from "@/api/client";
import { HomeBlockShell } from "@/components/home-block-shell";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { ProductCard } from "@/components/product-card";
import { productCardProps, productTypeLabel } from "@/lib/product-card-props";

function BlockTitle({ block }: { block: HomeBlock }) {
  if (!block.title) return null;
  return <h2 className={titleSizeClass(block.titleSize)}>{block.title}</h2>;
}

export function ContactFormBlockSection({ block }: { block: HomeBlock }) {
  const { tenant } = useStoreParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <HomeBlockShell block={block}>
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <BlockTitle block={block} />
        {block.subtitle ? <p className="mt-2 text-zinc-600">{block.subtitle}</p> : null}
        {done ? (
          <p className="mt-6 text-sm text-emerald-700">Message sent — we&apos;ll reply soon.</p>
        ) : (
          <form
            className="mt-6 space-y-4 max-w-lg"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setErr(null);
              try {
                await storeApi.contact(tenant, { name, email, message });
                setDone(true);
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Send failed");
              } finally {
                setPending(false);
              }
            }}
          >
            <input
              className="ugclab-input w-full"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              className="ugclab-input w-full"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <textarea
              className="ugclab-input w-full"
              rows={4}
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <button type="submit" disabled={pending} className="store-btn-primary px-6 py-2.5 text-sm">
              {pending ? "Sending…" : block.ctaLabel ?? "Send message"}
            </button>
          </form>
        )}
        {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      </div>
    </HomeBlockShell>
  );
}

export function TabsBlockSection({ block }: { block: HomeBlock }) {
  const items = block.tabItems ?? [];
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      <div>
        <BlockTitle block={block} />
        <div className="mt-4 flex flex-wrap gap-2 border-b border-zinc-200">
          {items.map((tab, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                active === i
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-zinc-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-zinc-700 whitespace-pre-wrap">{items[active]?.body}</p>
      </div>
    </HomeBlockShell>
  );
}

export function BlogFeedBlockSection({ block }: { block: HomeBlock }) {
  const { tenant, locale } = useStoreParams();
  const nav = { locale, tenant };
  const limit = block.blogLimit ?? 3;
  const { data } = useQuery({
    queryKey: ["blog-feed", tenant, limit],
    queryFn: () => storeApi.blogPosts(tenant, { limit: String(limit) }),
  });
  const posts = data?.posts ?? [];
  if (posts.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      <BlockTitle block={block} />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <li key={p.slug} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <Link to={storeHref(`/blog/${p.slug}`, nav)} className="font-semibold hover:text-violet-700">
              {p.title}
            </Link>
            {p.excerpt ? <p className="mt-2 text-sm text-zinc-600 line-clamp-3">{p.excerpt}</p> : null}
          </li>
        ))}
      </ul>
    </HomeBlockShell>
  );
}

export function CarouselBlockSection({ block }: { block: HomeBlock }) {
  const urls = block.galleryUrls ?? [];
  if (urls.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      <BlockTitle block={block} />
      <div className="mt-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
        {urls.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            className="h-56 w-80 shrink-0 snap-center rounded-xl object-cover"
          />
        ))}
      </div>
    </HomeBlockShell>
  );
}

export function InstagramEmbedBlockSection({ block }: { block: HomeBlock }) {
  const url = block.instagramEmbedUrl?.trim();
  if (!url) return null;
  const embedSrc = url.includes("instagram.com")
    ? url.replace(/\/?$/, "/embed")
    : url;
  return (
    <HomeBlockShell block={block}>
      <BlockTitle block={block} />
      <div className="mt-4 aspect-square max-w-md overflow-hidden rounded-xl bg-zinc-100">
        <iframe title="Instagram" src={embedSrc} className="h-full w-full border-0" />
      </div>
    </HomeBlockShell>
  );
}

export function ProductCompareBlockSection({ block }: { block: HomeBlock }) {
  const ctx = useStore();
  const { tenant, locale } = useStoreParams();
  const slugs = block.compareProductSlugs ?? [];
  const { data } = useQuery({
    queryKey: ["compare-products", tenant, slugs.join(",")],
    queryFn: async () => {
      const items = await Promise.all(
        slugs.map((slug) => storeApi.product(tenant, slug, locale).catch(() => null))
      );
      return items.filter(Boolean).map((r) => r!.product);
    },
    enabled: slugs.length > 0,
  });
  const products = data ?? [];
  if (products.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      <BlockTitle block={block} />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            {...productCardProps(p, {
              currency: ctx.currency,
              typeLabel: productTypeLabel(p.type),
              locale: ctx.locale,
              tenantSlug: ctx.tenant.slug,
            })}
          />
        ))}
      </ul>
    </HomeBlockShell>
  );
}

export function StickyCtaBar({ block }: { block: HomeBlock }) {
  const nav = useStore();
  const linkNav = { locale: nav.locale, tenant: nav.tenant.slug };
  return (
    <div
      className="store-sticky-cta fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:hidden"
      style={{
        backgroundColor: block.bgColor ?? "#fff",
        color: block.textColor ?? undefined,
      }}
    >
      <div className="store-container flex items-center justify-between gap-4">
        <div className="min-w-0">
          {block.title ? <p className="truncate font-semibold text-sm">{block.title}</p> : null}
          {block.subtitle ? <p className="truncate text-xs opacity-80">{block.subtitle}</p> : null}
        </div>
        {block.ctaLabel && block.ctaPath ? (
          <Link
            to={storeHref(block.ctaPath, linkNav)}
            className="store-btn-primary shrink-0 px-4 py-2 text-sm"
          >
            {block.ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
