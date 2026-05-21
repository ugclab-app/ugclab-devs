import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function NotificationsBar() {
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
    refetchInterval: 60_000,
  });

  if (!data) return null;
  const { pendingOrders, lowStockCount } = data;
  if (pendingOrders === 0 && lowStockCount === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {pendingOrders > 0 ? (
        <Link
          to="/orders?status=PENDING"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
            {pendingOrders}
          </span>
          Pending orders need attention
        </Link>
      ) : null}
      {lowStockCount > 0 ? (
        <Link
          to="/products?lowStock=1"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-900 hover:bg-red-100"
        >
          {lowStockCount} product{lowStockCount === 1 ? "" : "s"} low on stock
        </Link>
      ) : null}
    </div>
  );
}
