import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

type Buy = { city: string | null; country: string | null; minutesAgo: number };

function label(b: Buy): string {
  const where = [b.city, b.country].filter(Boolean).join(", ") || "someone";
  const ago =
    b.minutesAgo < 2
      ? "just now"
      : b.minutesAgo < 60
        ? `${b.minutesAgo} min ago`
        : `${Math.round(b.minutesAgo / 60)}h ago`;
  return `${where} bought this ${ago}`;
}

export function RecentPurchaseToast({ productSlug }: { productSlug: string }) {
  const { tenant } = useStoreParams();
  const { data } = useQuery({
    queryKey: ["recent-buys", tenant, productSlug],
    queryFn: () => storeApi.productRecentBuys(tenant, productSlug),
    staleTime: 60_000,
  });
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const buys = data?.buys ?? [];

  useEffect(() => {
    if (!buys.length) return;
    let hideTimer: number | undefined;
    const show = () => {
      setVisible(true);
      hideTimer = window.setTimeout(() => setVisible(false), 4500);
    };
    const start = window.setTimeout(show, 2500);
    const rotate = window.setInterval(() => {
      setIndex((i) => (i + 1) % buys.length);
      show();
    }, 14000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(rotate);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [buys.length]);

  if (!buys.length) return null;
  const current = buys[index % buys.length]!;

  return (
    <div
      className={`pointer-events-none fixed bottom-20 left-4 z-40 max-w-xs transition duration-500 sm:bottom-6 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 text-sm shadow-lg shadow-zinc-900/10 backdrop-blur">
        <p className="font-medium text-zinc-900">{label(current)}</p>
        <p className="mt-0.5 text-xs text-zinc-500">Verified purchase</p>
      </div>
    </div>
  );
}
