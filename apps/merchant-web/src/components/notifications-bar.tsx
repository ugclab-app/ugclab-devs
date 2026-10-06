import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAdminT } from "@/hooks/use-admin-t";

export function NotificationsBar() {
  const { ta } = useAdminT();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
    refetchInterval: 60_000,
  });
  const { data: msgs } = useQuery({
    queryKey: ["platform-messages"],
    queryFn: () => api.platformMessages(),
    refetchInterval: 60_000,
  });

  if (!data && !msgs) return null;
  const pendingOrders = data?.pendingOrders ?? 0;
  const lowStockCount = data?.lowStockCount ?? 0;
  const unreadMsgs = msgs?.unreadCount ?? 0;
  if (pendingOrders === 0 && lowStockCount === 0 && unreadMsgs === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {unreadMsgs > 0 ? (
        <Link
          to="/messages"
          className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-900 hover:bg-violet-100"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            {unreadMsgs}
          </span>
          Platform message{unreadMsgs === 1 ? "" : "s"}
        </Link>
      ) : null}
      {pendingOrders > 0 ? (
        <Link
          to="/orders?status=PENDING"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
            {pendingOrders}
          </span>
          {ta("notifications.pendingOrders", { count: pendingOrders })}
        </Link>
      ) : null}
      {lowStockCount > 0 ? (
        <Link
          to="/products?lowStock=1"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-900 hover:bg-red-100"
        >
          {lowStockCount} {ta("dashboard.lowStock")}
        </Link>
      ) : null}
    </div>
  );
}
