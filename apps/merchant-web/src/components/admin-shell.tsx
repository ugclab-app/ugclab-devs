import { Link } from "react-router-dom";
import { logout } from "@/api/client";
import { getStorefrontUrl, getStorefrontDisplayHost } from "@/lib/storefront";
import { AdminNav } from "@/components/admin-nav";
import { CopyStoreUrl } from "@/components/copy-store-url";

export type TenantInfo = {
  name: string;
  slug: string;
};

export function AdminShell({
  children,
  tenant,
  title,
  description,
}: {
  children: React.ReactNode;
  tenant: TenantInfo;
  title?: string;
  description?: string;
}) {
  const storeUrl = getStorefrontUrl(tenant.slug);

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200/80 bg-white">
        <div className="border-b border-zinc-100 p-5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-md shadow-violet-500/25">
              {tenant.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-900">
                {tenant.name}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {getStorefrontDisplayHost(tenant.slug)}
              </p>
            </div>
          </Link>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Store live
          </p>
        </div>

        <AdminNav />

        <div className="border-t border-zinc-100 p-3">
          <form
            action={async () => {
              "use server";
              await logout();
              window.location.href = "/login";
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/90 px-6 py-4 backdrop-blur-md">
          <div>
            {title ? (
              <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyStoreUrl url={storeUrl} />
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ugclab-btn ugclab-btn-primary inline-flex items-center gap-2 px-4 py-2.5"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
              View my store
            </a>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
