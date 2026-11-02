import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { api } from "@/api/client";
import { usePlatformPermissions } from "@/hooks/use-platform-permissions";
import { usePlatformLocale } from "@/i18n/locale";
import type { PlatformAdminLocale } from "@/i18n/messages";
import { NAV_ITEMS, type NavItem } from "@/lib/nav";
import { roleLabel } from "@/lib/platform-permissions";

export function PlatformLayout() {
  const { user } = useAuth();
  const { can } = usePlatformPermissions();
  const { locale, setLocale, t, navLabel } = usePlatformLocale();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [hint, setHint] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("platform-theme");
    const next = saved === "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    setDark(next);
  }, []);

  useEffect(() => {
    let chord = "";
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      const typing = Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        setHint("g i inbox · g m mail · g r money · g e errors · g b billing · g u buyers · t theme");
        return;
      }
      if (event.key === "t") {
        setDark((current) => {
          const next = !current;
          document.documentElement.dataset.theme = next ? "dark" : "light";
          localStorage.setItem("platform-theme", next ? "dark" : "light");
          return next;
        });
        return;
      }
      if (event.key === "g") {
        chord = "g";
        return;
      }
      const go: Record<string, string> = {
        i: "/inbox",
        m: "/mail",
        r: "/reconcile",
        e: "/payment-errors",
        b: "/billing",
        u: "/buyers",
      };
      const dest = go[event.key];
      if (chord === "g" && dest) navigate(dest);
      chord = "";
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      localStorage.setItem("platform-theme", next ? "dark" : "light");
      return next;
    });
  }

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
                {t.brandSub}
              </p>
              <p className="text-sm font-bold text-white">{t.platform}</p>
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
                  {t.navGroups[group]}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      item={item}
                      label={navLabel(item.to, item.label)}
                      active={isNavActive(pathname, item.to)}
                    />
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
          <label className="mt-2 flex items-center gap-2 px-1 text-xs text-slate-500">
            <span className="sr-only">{t.language}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as PlatformAdminLocale)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            >
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
            </select>
          </label>
          <button
            type="button"
            onClick={async () => {
              await api.logout();
              navigate("/login");
              window.location.reload();
            }}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
          >
            {t.signOut}
          </button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 bg-slate-100/80">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-8 py-4 backdrop-blur">
          <p className="text-sm text-slate-500">
            {t.signedInAs} <span className="font-medium text-slate-800">{user?.email}</span>
            {hint ? <span className="ml-3 text-slate-400">{hint}</span> : null}
          </p>
          <button type="button" className="text-sm text-slate-500" onClick={toggleTheme}>
            {dark ? t.light : t.dark}
          </button>
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

function NavLink({
  item,
  label,
  active,
}: {
  item: NavItem;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={item.to}
      className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}
