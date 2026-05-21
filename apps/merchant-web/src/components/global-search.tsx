import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@ugclab/i18n";
import { api } from "@/api/client";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSearch]);

  const { data } = useQuery({
    queryKey: ["search", q],
    queryFn: () => api.search(q),
    enabled: q.trim().length >= 2,
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const products = (data?.products ?? []) as { id: string; title: string; slug: string }[];
  const orders = (data?.orders ?? []) as {
    id: string;
    orderNumber: string;
    totalAmount: number;
    currency: string;
  }[];
  const customers = (data?.customers ?? []) as { id: string; email: string; name: string | null }[];

  const hasResults = products.length + orders.length + customers.length > 0;

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search products, orders, customers…"
        className="ugclab-input w-full pr-16 text-sm"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
        ⌘K
      </kbd>
      {open && q.trim().length >= 2 ? (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {!hasResults ? (
            <p className="px-4 py-3 text-sm text-zinc-500">No results</p>
          ) : (
            <>
              {products.length > 0 ? (
                <div className="border-b px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-zinc-400">Products</p>
                  {products.map((p) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}/edit`}
                      className="block rounded px-1 py-1.5 text-sm hover:bg-violet-50"
                      onClick={() => setOpen(false)}
                    >
                      {p.title}
                    </Link>
                  ))}
                </div>
              ) : null}
              {orders.length > 0 ? (
                <div className="border-b px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-zinc-400">Orders</p>
                  {orders.map((o) => (
                    <Link
                      key={o.id}
                      to={`/orders/${o.id}`}
                      className="block rounded px-1 py-1.5 text-sm hover:bg-violet-50"
                      onClick={() => setOpen(false)}
                    >
                      #{o.orderNumber} · {formatMoney(o.totalAmount, o.currency)}
                    </Link>
                  ))}
                </div>
              ) : null}
              {customers.length > 0 ? (
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-zinc-400">Customers</p>
                  {customers.map((c) => (
                    <Link
                      key={c.id}
                      to={`/customers/${c.id}`}
                      className="block rounded px-1 py-1.5 text-sm hover:bg-violet-50"
                      onClick={() => setOpen(false)}
                    >
                      {c.email}
                    </Link>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
