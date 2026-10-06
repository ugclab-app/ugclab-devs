import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { api } from "@/api/client";
import { usePlatformPermissions } from "@/hooks/use-platform-permissions";
import { NAV_GROUP_LABELS, NAV_ITEMS, type NavItem } from "@/lib/nav";
import { roleLabel } from "@/lib/platform-permissions";

export function PlatformLayout() {
  const { user } = useAuth();
  const { can } = usePlatformPermissions();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const visible = NAV_ITEMS.filter((item) => can(item.permission));
  const groups = ["overview", "commerce", "people", "platform", "trust"] as const;

  return (
    <div className="flex min-h-screen">
      <aside className="platform-sidebar flex w-64 shrink-0 flex-col border-r border-slate-800">
        <div className="border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-bold text-white">
              T
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Tescommerce
              </p>
              <p className="text-sm font-bold text-white">Platform</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {groups.map((group) => {
            const items = visible.filter((i) => i.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {NAV_GROUP_LABELS[group]}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink key={item.to} item={item} active={isNavActive(pathname, item.to)} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="rounded-lg bg-slate-900/80 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-slate-200">{user?.email}</p>
            <p className="mt-0.5 text-xs text-sky-400">{user ? roleLabel(user.role) : ""}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await api.logout();
              navigate("/login");
              window.location.reload();
            }}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 bg-slate-100/80">
        <div className="border-b border-slate-200/80 bg-white/80 px-8 py-4 backdrop-blur">
          <p className="text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-800">{user?.email}</span>
          </p>
        </div>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function isNavActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.to}
      className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
      }`}
    >
      {item.label}
    </Link>
  );
}
