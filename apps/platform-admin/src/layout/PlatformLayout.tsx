import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { api } from "@/api/client";

const links = [
  { to: "/dashboard", label: "Overview" },
  { to: "/inbox", label: "Inbox" },
  { to: "/search", label: "Search" },
  { to: "/revenue", label: "Revenue" },
  { to: "/disputes", label: "Disputes" },
  { to: "/tenants", label: "Stores" },
  { to: "/orders", label: "Orders" },
  { to: "/payouts", label: "Payouts" },
  { to: "/domains", label: "Domains" },
  { to: "/themes", label: "Themes" },
  { to: "/users", label: "Users" },
  { to: "/plans", label: "Plans" },
  { to: "/activity", label: "Activity" },
  { to: "/audit", label: "Audit" },
  { to: "/announcements", label: "Announcements" },
  { to: "/reports", label: "Reports" },
  { to: "/moderation", label: "Moderation" },
  { to: "/integrations", label: "Integrations" },
  { to: "/compliance", label: "Compliance" },
  { to: "/settings", label: "Settings" },
];

export function PlatformLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="platform-sidebar flex w-60 shrink-0 flex-col">
        <div className="border-b border-slate-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Tescommerce
          </p>
          <p className="mt-1 text-lg font-bold text-white">Platform</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {links.map((item) => {
            const active =
              pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <p className="truncate px-3 text-xs text-slate-500">{user?.email}</p>
          <button
            type="button"
            onClick={async () => {
              await api.logout();
              navigate("/login");
              window.location.reload();
            }}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-900"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 bg-slate-100 p-8">
        <Outlet />
      </main>
    </div>
  );
}
