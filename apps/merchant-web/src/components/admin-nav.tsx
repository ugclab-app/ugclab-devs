import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAdminLocale } from "@/context/admin-locale";
import { usePermissions } from "@/hooks/use-permissions";

type NavLabelKey = keyof {
  dashboard: string;
  storefront: string;
  analytics: string;
  analyticsLive: string;
  products: string;
  productsAddNew: string;
  productsAll: string;
  productsDigital: string;
  productsPhysical: string;
  productsServices: string;
  productsLowStock: string;
  collections: string;
  orders: string;
  ordersAll: string;
  ordersPending: string;
  ordersPaid: string;
  ordersFulfilled: string;
  ordersOnHold: string;
  returns: string;
  customers: string;
  customersAll: string;
  customersSegments: string;
  b2b: string;
  metafields: string;
  payments: string;
  marketing: string;
  growth: string;
  apps: string;
  abandonedCarts: string;
  shipping: string;
  inventory: string;
  discounts: string;
  discountsCodes: string;
  discountsAuto: string;
  pages: string;
  reviews: string;
  draftOrders: string;
  reports: string;
  activityLog: string;
  settings: string;
  messages: string;
  subscriptions: string;
  help: string;
};

type NavChild = { to: string; labelKey: NavLabelKey; fallback: string };

type NavItem = {
  to: string;
  labelKey: NavLabelKey;
  fallback: string;
  perm: string;
  badge?: "orders" | "lowStock" | "messages";
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { to: "/dashboard", labelKey: "dashboard", fallback: "Dashboard", perm: "dashboard" },
  { to: "/storefront", labelKey: "storefront", fallback: "Storefront", perm: "storefront" },
  {
    to: "/analytics",
    labelKey: "analytics",
    fallback: "Analytics",
    perm: "analytics",
    children: [
      { to: "/analytics", labelKey: "analytics", fallback: "Reports" },
      { to: "/analytics/live", labelKey: "analyticsLive", fallback: "Live View" },
    ],
  },
  {
    to: "/products",
    labelKey: "products",
    fallback: "Products",
    perm: "products",
    badge: "lowStock",
    children: [
      { to: "/products/new", labelKey: "productsAddNew", fallback: "Add new product" },
      { to: "/products", labelKey: "productsAll", fallback: "All products" },
      { to: "/products?type=DIGITAL", labelKey: "productsDigital", fallback: "Digital products" },
      { to: "/products?type=PHYSICAL", labelKey: "productsPhysical", fallback: "Physical products" },
      { to: "/products?type=SERVICE", labelKey: "productsServices", fallback: "Services" },
      { to: "/products?lowStock=1", labelKey: "productsLowStock", fallback: "Low stock" },
      { to: "/metafields", labelKey: "metafields", fallback: "Metafields" },
    ],
  },
  { to: "/collections", labelKey: "collections", fallback: "Collections", perm: "collections" },
  {
    to: "/orders",
    labelKey: "orders",
    fallback: "Orders",
    perm: "orders",
    badge: "orders",
    children: [
      { to: "/orders", labelKey: "ordersAll", fallback: "All orders" },
      { to: "/orders?status=PENDING", labelKey: "ordersPending", fallback: "Pending" },
      { to: "/orders?status=PAID", labelKey: "ordersPaid", fallback: "Paid" },
      { to: "/orders?status=FULFILLED", labelKey: "ordersFulfilled", fallback: "Fulfilled" },
      { to: "/returns", labelKey: "returns", fallback: "Returns" },
      { to: "/disputes", labelKey: "ordersOnHold", fallback: "Disputes" },
      { to: "/orders?view=on-hold", labelKey: "ordersOnHold", fallback: "On hold" },
      { to: "/orders?view=high-risk", labelKey: "ordersOnHold", fallback: "High risk" },
    ],
  },
  {
    to: "/customers",
    labelKey: "customers",
    fallback: "Customers",
    perm: "customers",
    children: [
      { to: "/customers", labelKey: "customersAll", fallback: "All customers" },
      { to: "/customers/segments", labelKey: "customersSegments", fallback: "Segments" },
      { to: "/b2b", labelKey: "b2b", fallback: "B2B" },
    ],
  },
  { to: "/payments", labelKey: "payments", fallback: "Payments", perm: "payments" },
  { to: "/marketing", labelKey: "marketing", fallback: "Email marketing", perm: "marketing" },
  { to: "/growth", labelKey: "growth", fallback: "Growth", perm: "growth" },
  { to: "/apps", labelKey: "apps", fallback: "Apps & themes", perm: "growth" },
  {
    to: "/subscriptions",
    labelKey: "subscriptions",
    fallback: "Subscriptions",
    perm: "orders",
  },
  {
    to: "/abandoned-carts",
    labelKey: "abandonedCarts",
    fallback: "Abandoned carts",
    perm: "abandoned-carts",
  },
  { to: "/shipping", labelKey: "shipping", fallback: "Shipping", perm: "shipping" },
  { to: "/inventory", labelKey: "inventory", fallback: "Inventory", perm: "products" },
  {
    to: "/discounts",
    labelKey: "discounts",
    fallback: "Discounts",
    perm: "discounts",
    children: [
      { to: "/discounts", labelKey: "discountsCodes", fallback: "Discount codes" },
      { to: "/promotions", labelKey: "discountsAuto", fallback: "Auto discounts" },
    ],
  },
  { to: "/pages", labelKey: "pages", fallback: "Pages", perm: "pages" },
  { to: "/reviews", labelKey: "reviews", fallback: "Reviews", perm: "reviews" },
  {
    to: "/draft-orders",
    labelKey: "draftOrders",
    fallback: "Draft orders",
    perm: "draft-orders",
  },
  {
    to: "/pos",
    labelKey: "draftOrders",
    fallback: "POS",
    perm: "draft-orders",
  },
  { to: "/reports", labelKey: "reports", fallback: "Reports", perm: "reports" },
  {
    to: "/activity-log",
    labelKey: "activityLog",
    fallback: "Activity log",
    perm: "activity-log",
  },
  { to: "/settings", labelKey: "settings", fallback: "Settings", perm: "settings" },
  { to: "/messages", labelKey: "messages", fallback: "Messages", perm: "settings", badge: "messages" },
  { to: "/help", labelKey: "help", fallback: "Help", perm: "settings" },
];

function navLabel(
  nav: Record<string, string> | undefined,
  key: NavLabelKey,
  fallback: string
) {
  return nav?.[key] ?? fallback;
}

function isChildActive(childTo: string, pathname: string, search: string): boolean {
  const [childPath, childQuery] = childTo.split("?");
  const params = new URLSearchParams(search);

  if (childQuery) {
    if (pathname !== childPath) return false;
    const expected = new URLSearchParams(childQuery);
    for (const [key, value] of expected) {
      if (params.get(key) !== value) return false;
    }
    return true;
  }

  if (childTo === "/products") {
    return (
      pathname === "/products" &&
      !params.get("type") &&
      params.get("lowStock") !== "1"
    );
  }

  if (childTo === "/orders") {
    return pathname === "/orders" && !params.get("status");
  }

  if (childTo === "/customers") {
    return (
      pathname === "/customers" ||
      (pathname.startsWith("/customers/") &&
        !pathname.startsWith("/customers/segments"))
    );
  }

  if (childTo === "/discounts") {
    return pathname === "/discounts" || pathname.startsWith("/discounts/");
  }

  if (childTo === "/analytics") {
    return pathname === "/analytics";
  }

  return pathname === childTo || pathname.startsWith(`${childTo}/`);
}

function isItemActive(item: NavItem, pathname: string, search: string): boolean {
  if (item.children?.length) {
    return item.children.some((c) => isChildActive(c.to, pathname, search));
  }
  return (
    pathname === item.to ||
    (item.to !== "/dashboard" && pathname.startsWith(item.to))
  );
}

function sectionOpen(item: NavItem, pathname: string, search: string): boolean {
  if (!item.children?.length) return false;
  if (item.to === "/products") return pathname.startsWith("/products");
  if (item.to === "/analytics") return pathname.startsWith("/analytics");
  if (item.to === "/orders")
    return pathname === "/orders" || pathname.startsWith("/orders/");
  if (item.to === "/customers") return pathname.startsWith("/customers");
  if (item.to === "/discounts")
    return pathname.startsWith("/discounts") || pathname.startsWith("/promotions");
  return isItemActive(item, pathname, search);
}

const linkClass = (active: boolean) =>
  `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium leading-snug transition ${
    active
      ? "bg-violet-50 text-violet-700"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
  }`;

const childLinkClass = (active: boolean) =>
  `block rounded-md py-1 pl-9 pr-2.5 text-[12px] leading-snug transition ${
    active
      ? "bg-violet-50 font-medium text-violet-700"
      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
  }`;

export function AdminNav() {
  const { pathname, search } = useLocation();
  const { t } = useAdminLocale();
  const { can } = usePermissions();
  const nav = t.nav as Record<string, string> | undefined;
  const label = (key: NavLabelKey, fallback: string) => navLabel(nav, key, fallback);
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
    refetchInterval: 60_000,
  });
  const { data: platformMsgs } = useQuery({
    queryKey: ["platform-messages"],
    queryFn: () => api.platformMessages(),
    refetchInterval: 60_000,
  });
  const pendingOrders = notifications?.pendingOrders ?? 0;
  const lowStockCount = notifications?.lowStockCount ?? 0;
  const unreadPlatformMsgs = platformMsgs?.unreadCount ?? 0;

  const visible = navItems.filter((item) => {
    if (item.to === "/discounts") return can("discounts") || can("promotions");
    return can(item.perm);
  });

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
      {visible.map((item) => {
        const active = isItemActive(item, pathname, search);
        const open = sectionOpen(item, pathname, search);

        if (!item.children?.length) {
          return (
            <Link key={item.to} to={item.to} className={linkClass(active)}>
              <NavIcon href={item.to} active={active} />
              <span className="flex-1">{label(item.labelKey, item.fallback)}</span>
              {item.badge === "messages" && unreadPlatformMsgs > 0 ? (
                <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unreadPlatformMsgs > 99 ? "99+" : unreadPlatformMsgs}
                </span>
              ) : null}
            </Link>
          );
        }

        return (
          <div key={item.to} className="space-y-0.5">
            <Link
              to={
                item.to === "/discounts" && !can("discounts")
                  ? "/promotions"
                  : item.to
              }
              className={linkClass(open || active)}
            >
              <NavIcon href={item.to} active={active} />
              <span className="flex-1">{label(item.labelKey, item.fallback)}</span>
              {item.badge === "orders" && pendingOrders > 0 ? (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {pendingOrders > 99 ? "99+" : pendingOrders}
                </span>
              ) : null}
              {item.badge === "lowStock" && lowStockCount > 0 ? (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {lowStockCount > 99 ? "99+" : lowStockCount}
                </span>
              ) : null}
            </Link>
            {open ? (
              <div className="space-y-0.5 pb-1">
                {item.children
                  .filter((c) => {
                    if (c.to === "/promotions") return can("promotions");
                    if (c.to === "/discounts") return can("discounts");
                    return true;
                  })
                  .map((child) => {
                    const childActive = isChildActive(
                      child.to,
                      pathname,
                      search
                    );
                    return (
                      <Link
                        key={child.to}
                        to={child.to}
                        className={childLinkClass(childActive)}
                      >
                        {label(child.labelKey, child.fallback)}
                      </Link>
                    );
                  })}
              </div>
            ) : null}
          </div>
        );
      })}
      <Link to="/partner" className={linkClass(pathname === "/partner")}>
        <span className="flex-1">Partner program</span>
      </Link>
    </nav>
  );
}

function NavIcon({ href, active }: { href: string; active: boolean }) {
  const c = active ? "text-violet-600" : "text-zinc-400";
  if (href === "/dashboard")
    return (
      <svg className={`h-4 w-4 ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
      </svg>
    );
  if (href === "/collections")
    return (
      <svg className={`h-4 w-4 ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    );
  if (href === "/shipping")
    return (
      <svg className={`h-4 w-4 ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    );
  if (href === "/products")
    return (
      <svg className={`h-4 w-4 ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  if (href === "/orders")
    return (
      <svg className={`h-4 w-4 ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
  if (href === "/customers")
    return (
      <svg className={`h-4 w-4 ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    );
  return (
    <svg className={`h-4 w-4 shrink-0 ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
