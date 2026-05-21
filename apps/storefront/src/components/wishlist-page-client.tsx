import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "@ugclab/i18n";
import { storeApi } from "@/api/client";
import { useStore } from "@/context/store";
import { storeHref } from "@/lib/store-href";
import { useStoreParams } from "@/hooks/use-store-params";

const KEY = "ugclab_wishlist";

type Item = { productId: string; title: string; slug: string; priceAmount: number };

export function WishlistClient() {
  const { currency, locale, tenant } = useStore();
  const { tenant: tenantSlug } = useStoreParams();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = { locale, tenant: tenant.slug };

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem(KEY);
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        if (ids.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }
        const data = await storeApi.wishlist(tenantSlug, ids);
        setItems(data.items);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantSlug]);

  if (loading) return <p className="mt-8 text-zinc-500">Loading…</p>;

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-zinc-600">Your wishlist is empty.</p>
        <Link to={storeHref("/", nav)} className="store-btn-primary mt-6 inline-block">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-8 divide-y rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {items.map((item) => (
        <li key={item.productId} className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link
              to={storeHref(`/products/${item.slug}`, nav)}
              className="font-semibold hover:text-[var(--store-primary)]"
            >
              {item.title}
            </Link>
            <p className="text-sm text-zinc-500">{formatMoney(item.priceAmount, currency)}</p>
          </div>
          <Link to={storeHref(`/products/${item.slug}`, nav)} className="store-btn-secondary shrink-0">
            View
          </Link>
        </li>
      ))}
    </ul>
  );
}
