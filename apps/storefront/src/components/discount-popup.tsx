import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { storeApi } from "@/api/client";
import { storeHref } from "@/lib/store-href";

function dismissKey(tenantId: string) {
  return `ugclab_discount_popup_${tenantId}`;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState("");

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    function tick() {
      const diff = end - Date.now();
      if (diff <= 0) {
        setLeft("Ended");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${h}h ${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <p className="mt-2 text-sm font-mono opacity-90">{left}</p>;
}

export function DiscountPopup({
  block,
  tenantId,
  nav,
}: {
  block: HomeBlock;
  tenantId: string;
  nav: { locale: string; tenant: string };
}) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<"in" | "confirm" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const delayMs = (block.popupDelaySec ?? 3) * 1000;

  useEffect(() => {
    if (localStorage.getItem(dismissKey(tenantId)) === "1") return;
    const t = window.setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [tenantId, delayMs]);

  if (!visible) return null;

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setErr(null);
    try {
      const res = await storeApi.newsletterSubscribe(nav.tenant, email);
      setDone(res.pendingConfirm ? "confirm" : "in");
      localStorage.setItem(dismissKey(tenantId), "1");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not sign up");
    } finally {
      setPending(false);
    }
  }

  function dismiss() {
    localStorage.setItem(dismissKey(tenantId), "1");
    setVisible(false);
  }

  if (block.collectEmail) {
    return (
      <div className="store-discount-popup-overlay" role="presentation" onClick={dismiss}>
        <div
          className="store-signup-popup"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="store-signup-popup-close" onClick={dismiss} aria-label="Close">
            ✕
          </button>
          <div className="store-signup-popup-media">
            {block.imageUrl ? <img src={block.imageUrl} alt="" /> : null}
          </div>
          <form className="store-signup-popup-form" onSubmit={(e) => void subscribe(e)}>
            {block.title ? <h2>{block.title}</h2> : null}
            {done ? (
              <p className="mt-4 text-sm text-zinc-700">
                {done === "confirm"
                  ? "Check your inbox to confirm."
                  : block.discountCode
                    ? `You're in. Your code is ${block.discountCode}.`
                    : "You're on the list."}
              </p>
            ) : (
              <>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Email"
                  aria-label="Email"
                />
                <button type="submit" disabled={pending}>
                  {pending ? "…" : block.ctaLabel || "Sign up"}
                </button>
                {block.body ? <p className="store-signup-popup-fine">{block.body}</p> : null}
                {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
              </>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="store-discount-popup-overlay" role="presentation" onClick={dismiss}>
      <div
        className="store-discount-popup"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: block.bgColor ?? "var(--store-primary, #7c3aed)",
          color: block.textColor ?? "#fff",
        }}
      >
        <button type="button" className="store-discount-popup-close" onClick={dismiss} aria-label="Close">
          ✕
        </button>
        {block.title ? <h2 className="text-xl font-bold">{block.title}</h2> : null}
        {block.subtitle ? <p className="mt-2 text-sm opacity-90">{block.subtitle}</p> : null}
        {block.discountCode ? (
          <p className="mt-4 rounded-lg border border-dashed border-white/40 bg-black/10 px-4 py-3 text-center font-mono text-lg font-bold tracking-widest">
            {block.discountCode}
          </p>
        ) : null}
        {block.body ? <p className="mt-2 text-xs opacity-80">{block.body}</p> : null}
        {block.countdownEndsAt ? <Countdown endsAt={block.countdownEndsAt} /> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {block.ctaLabel && block.ctaPath ? (
            <Link
              to={storeHref(block.ctaPath, nav)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-800"
              onClick={dismiss}
            >
              {block.ctaLabel}
            </Link>
          ) : null}
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/90 underline-offset-2 hover:underline"
            onClick={dismiss}
          >
            No thanks
          </button>
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs opacity-80">
          <input
            type="checkbox"
            className="rounded"
            onChange={(e) => {
              if (e.target.checked) localStorage.setItem(dismissKey(tenantId), "1");
            }}
          />
          Don&apos;t show again
        </label>
      </div>
    </div>
  );
}
