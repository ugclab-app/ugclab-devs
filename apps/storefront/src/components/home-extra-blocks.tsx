import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { storeApi } from "@/api/client";
import { HomeBlockShell } from "@/components/home-block-shell";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

export function CtaBlockSection({
  block,
  nav,
}: {
  block: HomeBlock;
  nav: { locale: string; tenant: string };
}) {
  const align = block.align ?? "center";
  return (
    <HomeBlockShell block={block}>
      <div
        className={`rounded-2xl px-8 py-12 ${
          align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
        }`}
        style={{
          backgroundColor: block.bgColor ?? "var(--store-primary, #7c3aed)",
          color: block.textColor ?? "#fff",
        }}
      >
        {block.title ? <h2 className="text-2xl font-bold sm:text-3xl">{block.title}</h2> : null}
        {block.subtitle ? <p className="mt-3 text-lg opacity-90">{block.subtitle}</p> : null}
        {block.ctaLabel && block.ctaPath ? (
          <Link
            to={storeHref(block.ctaPath, nav)}
            className="mt-8 inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-violet-800 shadow"
          >
            {block.ctaLabel}
          </Link>
        ) : null}
      </div>
    </HomeBlockShell>
  );
}

export function ImageTextBlockSection({
  block,
  nav,
}: {
  block: HomeBlock;
  nav: { locale: string; tenant: string };
}) {
  const imageFirst = block.imagePosition !== "right";
  const text = (
    <div className="flex flex-col justify-center p-6 sm:p-10">
      {block.title ? <h2 className="text-2xl font-bold text-zinc-900">{block.title}</h2> : null}
      {block.subtitle ? <p className="mt-3 text-zinc-600">{block.subtitle}</p> : null}
      {block.body ? <p className="mt-2 text-sm text-zinc-500">{block.body}</p> : null}
      {block.ctaLabel && block.ctaPath ? (
        <Link
          to={storeHref(block.ctaPath, nav)}
          className="store-btn-primary mt-6 inline-block w-fit px-6 py-2.5 text-sm"
        >
          {block.ctaLabel}
        </Link>
      ) : null}
    </div>
  );
  const image = block.imageUrl ? (
    <img src={block.imageUrl} alt="" className="h-full min-h-[240px] w-full object-cover" />
  ) : (
    <div className="flex min-h-[240px] items-center justify-center bg-zinc-100 text-sm text-zinc-400">
      No image
    </div>
  );

  return (
    <HomeBlockShell block={block}>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className={`grid md:grid-cols-2 ${imageFirst ? "" : "md:[direction:rtl]"}`}>
          <div className={imageFirst ? "" : "md:[direction:ltr]"}>{image}</div>
          <div className={imageFirst ? "" : "md:[direction:ltr]"}>{text}</div>
        </div>
      </div>
    </HomeBlockShell>
  );
}

export function GalleryBlockSection({ block }: { block: HomeBlock }) {
  const urls = block.galleryUrls ?? [];
  if (urls.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      {block.title ? <h2 className="mb-6 text-2xl font-bold text-zinc-900">{block.title}</h2> : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {urls.map((url, i) => (
          <li key={i} className="overflow-hidden rounded-xl border border-zinc-200">
            <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
          </li>
        ))}
      </ul>
    </HomeBlockShell>
  );
}

export function FeaturesBlockSection({ block }: { block: HomeBlock }) {
  const items = block.features ?? [];
  if (items.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      {block.title ? (
        <h2
          className={`mb-8 text-2xl font-bold text-zinc-900 ${
            block.align === "center" ? "text-center" : ""
          }`}
        >
          {block.title}
        </h2>
      ) : null}
      <ul className="grid gap-6 sm:grid-cols-3">
        {items.map((f, i) => (
          <li key={i} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="font-semibold text-zinc-900">{f.title}</p>
            <p className="mt-2 text-sm text-zinc-600">{f.text}</p>
          </li>
        ))}
      </ul>
    </HomeBlockShell>
  );
}

export function SpacerBlockSection({ block }: { block: HomeBlock }) {
  const h = block.spacerHeight ?? 48;
  return <div style={{ height: h }} aria-hidden />;
}

export function DividerBlockSection({ block }: { block: HomeBlock }) {
  return (
    <HomeBlockShell block={{ ...block, paddingY: block.paddingY ?? "sm" }}>
      <hr className="border-zinc-200" />
    </HomeBlockShell>
  );
}

export function ColumnsBlockSection({ block }: { block: HomeBlock }) {
  const cols = block.columns ?? [];
  const n = block.columnCount ?? 3;
  if (cols.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      {block.title ? (
        <h2
          className={`mb-8 text-2xl font-bold text-zinc-900 ${
            block.align === "center" ? "text-center" : ""
          }`}
        >
          {block.title}
        </h2>
      ) : null}
      <ul
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${Math.min(n, cols.length)}, minmax(0, 1fr))` }}
      >
        {cols.slice(0, n).map((col, i) => (
          <li key={i} className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
            {col.imageUrl ? (
              <img src={col.imageUrl} alt="" className="mx-auto mb-4 h-16 w-16 object-contain" />
            ) : null}
            {col.title ? <p className="font-semibold text-zinc-900">{col.title}</p> : null}
            {col.text ? <p className="mt-2 text-sm text-zinc-600">{col.text}</p> : null}
          </li>
        ))}
      </ul>
    </HomeBlockShell>
  );
}

export function NewsletterBlockSection({ block }: { block: HomeBlock }) {
  const { tenant } = useStoreParams();
  const align = block.align ?? "center";
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <HomeBlockShell block={block}>
      <div
        className={`rounded-2xl px-8 py-10 ${align === "center" ? "text-center" : ""}`}
        style={{ backgroundColor: block.bgColor ?? "#f4f4f5" }}
      >
        {block.title ? <h2 className="text-2xl font-bold text-zinc-900">{block.title}</h2> : null}
        {block.subtitle ? <p className="mt-2 text-zinc-600">{block.subtitle}</p> : null}
        {done ? (
          <p className="mt-6 text-sm text-emerald-700">Thanks — you&apos;re subscribed.</p>
        ) : (
          <form
            className={`mt-6 flex max-w-md gap-2 ${align === "center" ? "mx-auto" : ""}`}
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setErr(null);
              try {
                await storeApi.newsletterSubscribe(tenant, email);
                setDone(true);
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Subscribe failed");
              } finally {
                setPending(false);
              }
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="ugclab-input flex-1"
              aria-label="Email"
            />
            <button
              type="submit"
              disabled={pending}
              className="store-btn-primary shrink-0 px-5 py-2 text-sm"
            >
              {pending ? "…" : "Subscribe"}
            </button>
          </form>
        )}
        {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      </div>
    </HomeBlockShell>
  );
}

export function CountdownBlockSection({ block }: { block: HomeBlock }) {
  return (
    <HomeBlockShell block={block}>
      <CountdownInner block={block} />
    </HomeBlockShell>
  );
}

function CountdownInner({ block }: { block: HomeBlock }) {
  const ends = block.countdownEndsAt ? new Date(block.countdownEndsAt).getTime() : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  let label = "00 : 00 : 00 : 00";
  if (ends && ends > now) {
    const d = Math.floor((ends - now) / 1000);
    const days = Math.floor(d / 86400);
    const hrs = Math.floor((d % 86400) / 3600);
    const min = Math.floor((d % 3600) / 60);
    const sec = d % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    label = `${pad(days)} : ${pad(hrs)} : ${pad(min)} : ${pad(sec)}`;
  }
  const align = block.align ?? "center";
  return (
    <div
      className={`rounded-2xl px-8 py-10 ${align === "center" ? "text-center" : ""}`}
      style={{
        backgroundColor: block.bgColor ?? "var(--store-primary)",
        color: block.textColor ?? "#fff",
      }}
    >
      {block.title ? <h2 className="text-xl font-bold">{block.title}</h2> : null}
      {block.subtitle ? <p className="mt-2 opacity-90">{block.subtitle}</p> : null}
      <p className="mt-6 font-mono text-3xl font-bold tracking-widest sm:text-4xl">{label}</p>
    </div>
  );
}

export function MapBlockSection({ block }: { block: HomeBlock }) {
  const url = block.mapEmbedUrl;
  if (!url?.trim()) return null;
  return (
    <HomeBlockShell block={block}>
      {block.title ? <h2 className="mb-4 text-2xl font-bold text-zinc-900">{block.title}</h2> : null}
      <div className="overflow-hidden rounded-2xl border border-zinc-200">
        <iframe title="Map" src={url} className="h-80 w-full border-0" loading="lazy" />
      </div>
    </HomeBlockShell>
  );
}

export function LogosBlockSection({ block }: { block: HomeBlock }) {
  const urls = block.logoUrls ?? [];
  if (urls.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      {block.title ? (
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {block.title}
        </p>
      ) : null}
      <ul className="flex flex-wrap items-center justify-center gap-8">
        {urls.map((url, i) => (
          <li key={i}>
            <img src={url} alt="" className="h-12 max-w-[140px] object-contain opacity-80" />
          </li>
        ))}
      </ul>
    </HomeBlockShell>
  );
}

export function PricingBlockSection({
  block,
  nav,
}: {
  block: HomeBlock;
  nav: { locale: string; tenant: string };
}) {
  const plans = block.pricingItems ?? [];
  if (plans.length === 0) return null;
  return (
    <HomeBlockShell block={block}>
      {block.title ? (
        <h2 className="mb-8 text-center text-2xl font-bold text-zinc-900">{block.title}</h2>
      ) : null}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <li
            key={i}
            className={`rounded-2xl border p-8 ${
              plan.highlighted
                ? "border-violet-400 bg-violet-50 shadow-lg ring-2 ring-violet-200"
                : "border-zinc-200 bg-white shadow-sm"
            }`}
          >
            <p className="font-semibold text-zinc-900">{plan.name}</p>
            <p className="mt-2 text-3xl font-bold text-violet-700">{plan.price}</p>
            {plan.description ? (
              <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>
            ) : null}
            {plan.features?.length ? (
              <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                {plan.features.map((f, j) => (
                  <li key={j}>✓ {f}</li>
                ))}
              </ul>
            ) : null}
            {plan.ctaLabel ? (
              <Link
                to={storeHref(block.ctaPath ?? "/collections", nav)}
                className="store-btn-primary mt-6 inline-block w-full py-2.5 text-center text-sm"
              >
                {plan.ctaLabel}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </HomeBlockShell>
  );
}
