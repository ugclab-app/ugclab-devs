import { Link } from "react-router-dom";
import { formatMoney } from "@ugclab/i18n";

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
  const cards = [
    {
      label: "Orders today",
      value: String(ordersToday),
      href: "/orders",
    },
    {
      label: "Revenue today",
      value: formatMoney(revenueToday, currency),
      href: "/orders?status=PAID",
    },
    {
      label: `GMV (${range}d)`,
      value: formatMoney(rangeRevenue, currency),
      href: "/orders",
    },
    ...(netPayout != null
      ? [
          {
            label: `Net payout (${range}d)`,
            value: formatMoney(netPayout, currency),
            href: "/reports",
          },
        ]
      : []),
    ...(platformFees != null && platformFees > 0
      ? [
          {
            label: `Platform fees (${range}d)`,
            value: formatMoney(platformFees, currency),
            href: "/reports",
          },
        ]
      : []),
    {
      label: "Pending orders",
      value: String(pendingOrders),
      href: "/orders?status=PENDING",
      highlight: pendingOrders > 0,
    },
    {
      label: "Low stock",
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
