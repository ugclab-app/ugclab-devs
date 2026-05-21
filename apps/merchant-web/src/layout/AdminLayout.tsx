import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { api } from "@/api/client";
import { getStorefrontDisplayHost, getStorefrontUrl } from "@/lib/storefront";
import { AdminNav } from "@/components/admin-nav";
import { GlobalSearch } from "@/components/global-search";
import { CopyStoreUrl } from "@/components/copy-store-url";
import { NotificationCenter } from "@/components/notification-center";
import { CommandPalette } from "@/components/command-palette";

export function AdminLayout() {
  const { tenant } = useAuth();
  const navigate = useNavigate();

  if (!tenant) {
    return <Navigate to="/no-store" replace />;
  }

  const storeUrl = getStorefrontUrl(tenant.slug);

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <CommandPalette />
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200/80 bg-white">
        <div className="border-b border-zinc-100 p-5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white">
              {tenant.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-900">
                {tenant.name}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {tenant.displayHost ?? getStorefrontDisplayHost(tenant.slug)}
              </p>
            </div>
          </Link>
        </div>
        <AdminNav />
        <div className="border-t border-zinc-100 p-3">
          <button
            type="button"
            onClick={async () => {
              await api.logout();
              navigate("/login");
              window.location.reload();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/90 px-6 py-4 backdrop-blur-md">
          <GlobalSearch />
          <div className="flex gap-2">
            <NotificationCenter />
            <CopyStoreUrl url={storeUrl} />
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="ugclab-btn ugclab-btn-primary px-4 py-2.5"
            >
              View my store
            </a>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
