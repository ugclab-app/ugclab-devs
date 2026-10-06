import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { api } from "@/api/client";
import { getStorefrontUrl } from "@/lib/storefront";
import { AdminNav } from "@/components/admin-nav";
import { AdminLocaleSwitcher } from "@/components/admin-locale-switcher";
import { GlobalSearch } from "@/components/global-search";
import { CopyStoreUrl } from "@/components/copy-store-url";
import { NotificationCenter } from "@/components/notification-center";
import { CommandPalette } from "@/components/command-palette";
import { StoreSwitcher } from "@/components/store-switcher";
import { useAdminLocale } from "@/context/admin-locale";

export function AdminLayout() {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();
  const { ta, t, locale } = useAdminLocale();

  if (!tenant) {
    return <Navigate to="/no-store" replace />;
  }

  const storeUrl = getStorefrontUrl(tenant.slug, locale);
  const { data: annData } = useQuery({
    queryKey: ["platform-announcement"],
    queryFn: () => api.platformAnnouncement(),
  });
  const announcement = annData?.announcement;
  const topPad = (user?.impersonatedBy ? 10 : 0) + (announcement ? 12 : 0);

  return (
    <div
      className={`flex min-h-screen bg-zinc-100 ${topPad > 0 ? `pt-${topPad}` : ""}`}
      style={topPad > 0 ? { paddingTop: topPad * 4 } : undefined}
    >
      {user?.impersonatedBy ? (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          Support mode — logged in as <strong>{user.email}</strong> (by{" "}
          {user.impersonatedBy}). Actions are audited.
        </div>
      ) : null}
      {announcement ? (
        <div
          className={`fixed inset-x-0 z-40 border-b border-sky-200 bg-sky-50 px-4 py-2 text-center text-sm text-sky-950 ${user?.impersonatedBy ? "top-10" : "top-0"}`}
        >
          <strong>{announcement.title}</strong> — {announcement.message}
        </div>
      ) : null}
      <CommandPalette />
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200/80 bg-white">
        <div className="border-b border-zinc-100 p-5">
          <StoreSwitcher />
          <div className="mt-2.5">
            <AdminLocaleSwitcher compact />
          </div>
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
            {t.signOut}
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
              href={`${storeUrl}${storeUrl.includes("?") ? "&" : "?"}preview=1`}
              target="_blank"
              rel="noreferrer"
              className="ugclab-btn border border-zinc-200 bg-white px-3 py-2.5 text-sm"
              title="Draft theme from Storefront editor"
            >
              {ta("previewDraft")}
            </a>
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="ugclab-btn ugclab-btn-primary px-4 py-2.5"
              title="What customers see after Publish"
            >
              {ta("liveStore")}
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
