import { Link } from "react-router-dom";
import { formatMoney } from "@ugclab/i18n";
import { useAdminT } from "@/hooks/use-admin-t";

type Props = {
  currency: string;
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  lowStockCount: number;
  rangeRevenue: number;
  range: number;
  netPayout?: number;
  platformFees?: number;
};

export function DashboardStatCards({
  currency,
  ordersToday,
  revenueToday,
  pendingOrders,
  lowStockCount,
  rangeRevenue,
  range,
  netPayout,
  platformFees,
}: Props) {
  const { ta } = useAdminT();

  const cards = [
    {
      label: ta("dashboard.ordersTodayCard"),
      value: String(ordersToday),
      href: "/orders",
    },
    {
      label: ta("dashboard.revenueToday"),
      value: formatMoney(revenueToday, currency),
      href: "/orders?status=PAID",
    },
    {
      label: ta("dashboard.gmv", { range }),
      value: formatMoney(rangeRevenue, currency),
      href: "/orders",
    },
    ...(netPayout != null
      ? [
          {
            label: ta("dashboard.netPayout", { range }),
            value: formatMoney(netPayout, currency),
            href: "/reports",
          },
        ]
      : []),
    ...(platformFees != null && platformFees > 0
      ? [
          {
            label: ta("dashboard.platformFee"),
            value: formatMoney(platformFees, currency),
            href: "/reports",
          },
        ]
      : []),
    {
      label: ta("dashboard.pendingOrders"),
      value: String(pendingOrders),
      href: "/orders?status=PENDING",
      highlight: pendingOrders > 0,
    },
    {
      label: ta("dashboard.lowStock"),
      value: String(lowStockCount),
      href: "/products?lowStock=1",
      highlight: lowStockCount > 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <Link
          key={card.label}
          to={card.href}
          className={`admin-card block p-4 transition hover:ring-2 hover:ring-violet-200 ${
            card.highlight ? "border-amber-200 bg-amber-50/50" : ""
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{card.value}</p>
        </Link>
      ))}
    </div>
  );
}
