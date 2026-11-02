import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney, moneyLocaleFor } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { productImageUrl } from "@/lib/product-images";

const HOLD_MS = 10 * 60 * 1000;
const HOLD_KEY = "ugclab-cart-hold-until";

function holdDeadline(hasItems: boolean) {
  if (!hasItems) {
    sessionStorage.removeItem(HOLD_KEY);
    return null;
  }
  const existing = Number(sessionStorage.getItem(HOLD_KEY) || 0);
  if (existing > Date.now()) return existing;
  const next = Date.now() + HOLD_MS;
  sessionStorage.setItem(HOLD_KEY, String(next));
  return next;
}

function formatLeft(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const PAYMENT_MARKS = ["Visa", "Mastercard", "Amex", "PayPal", "Apple Pay", "Google Pay"];

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ctx = useStore();
  const { tenant, locale } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const cartQ = useQuery({
    queryKey: ["cart", tenant],
    queryFn: () => storeApi.cart(tenant),
    enabled: open,
  });
  const lines = cartQ.data?.lines ?? [];
  const [now, setNow] = useState(Date.now());
  const deadline = open ? holdDeadline(lines.length > 0 || ctx.cartCount > 0) : null;

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const left = deadline != null ? deadline - now : 0;
  const currency = cartQ.data?.currency ?? ctx.currency;
  const total = cartQ.data?.total ?? 0;

  return (
    <div className="store-cart-drawer" role="presentation">
      <button type="button" className="store-cart-drawer-backdrop" aria-label="Close cart" onClick={onClose} />
      <aside className="store-cart-drawer-panel" role="dialog" aria-label="Cart">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="font-semibold">
            Cart{lines.length ? ` · ${lines.reduce((n, l) => n + l.quantity, 0)}` : ""}
          </h2>
          <button type="button" className="text-sm text-zinc-500" onClick={onClose}>
            Close
          </button>
        </div>
        {deadline != null ? (
          <p className="border-b border-zinc-100 px-4 py-2 text-sm text-zinc-600">
            {left > 0 ? `Cart reserved for ${formatLeft(left)}` : "Reservation ended. Your items are still here."}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {cartQ.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
          {!cartQ.isLoading && lines.length === 0 ? (
            <p className="text-sm text-zinc-500">Your cart is empty.</p>
          ) : null}
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={`${line.productId}-${line.variantId ?? ""}-${line.unitAmountCents ?? ""}`} className="flex gap-3 text-sm">
                {line.imageKey ? (
                  <img src={productImageUrl(line.imageKey)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-zinc-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{line.title}</p>
                  <p className="text-zinc-500">
                    {line.quantity} × {formatMoney(line.unit, currency, moneyLocaleFor(currency, locale))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-zinc-200 px-4 py-4">
          <div className="flex justify-between text-sm font-semibold">
            <span>Subtotal</span>
            <span>{formatMoney(total, currency, moneyLocaleFor(currency, locale))}</span>
          </div>
          <Link
            to={storeHref("/checkout", nav)}
            className="mt-3 block rounded-full py-3 text-center text-sm font-semibold text-white"
            style={{ background: ctx.primaryColor }}
            onClick={onClose}
          >
            Check out
          </Link>
          <Link
            to={storeHref("/cart", nav)}
            className="mt-2 block text-center text-sm text-zinc-500"
            onClick={onClose}
          >
            View cart
          </Link>
          {ctx.theme.showPaymentIcons !== false ? (
            <ul className="mt-3 flex flex-wrap justify-center gap-1">
              {PAYMENT_MARKS.map((name) => (
                <li key={name} className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
