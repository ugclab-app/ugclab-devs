import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pending = data?.pendingOrders ?? 0;
  const lowStock = data?.lowStockCount ?? 0;
  const total = pending + lowStock;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-zinc-200 bg-white p-2.5 text-zinc-600 hover:bg-zinc-50"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {total > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {total > 9 ? "9+" : total}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white py-2 shadow-lg">
          <p className="px-4 py-2 text-xs font-semibold uppercase text-zinc-400">
            Notifications
          </p>
          {total === 0 ? (
            <p className="px-4 py-4 text-sm text-zinc-500">All caught up</p>
          ) : (
            <ul className="text-sm">
              {pending > 0 ? (
                <li>
                  <Link
                    to="/orders?status=PENDING"
                    className="block px-4 py-2.5 hover:bg-violet-50"
                    onClick={() => setOpen(false)}
                  >
                    {pending} pending order{pending === 1 ? "" : "s"}
                  </Link>
                </li>
              ) : null}
              {lowStock > 0 ? (
                <li>
                  <Link
                    to="/products?lowStock=1"
                    className="block px-4 py-2.5 hover:bg-violet-50"
                    onClick={() => setOpen(false)}
                  >
                    {lowStock} low stock
                  </Link>
                </li>
              ) : null}
              <li>
                <Link
                  to="/payments"
                  className="block px-4 py-2.5 text-zinc-600 hover:bg-violet-50"
                  onClick={() => setOpen(false)}
                >
                  Payments & billing
                </Link>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
