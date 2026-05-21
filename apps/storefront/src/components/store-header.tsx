import { Link } from "react-router-dom";
import { Button } from "@ugclab/ui";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { StoreSearch } from "@/components/store-search";

export function StoreHeader() {
  const ctx = useStore();
  const { locale, tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };

  return (
    <header
      className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 py-4 backdrop-blur-md"
      style={{ borderBottomColor: ctx.primaryColor }}
    >
      <div className="store-container flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to={storeHref("/", nav)} className="flex items-center gap-3">
          {ctx.logoUrl ? (
            <img src={ctx.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : null}
          <span className="text-xl font-bold" style={{ color: ctx.primaryColor }}>
            {ctx.tenant.name}
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <StoreSearch locale={locale} tenantSlug={tenant} />
          {!ctx.theme.hideDefaultNav ? (
            <>
              {ctx.collections.length > 0 ? (
                <details className="relative text-sm">
                  <summary className="cursor-pointer list-none text-zinc-600 hover:text-zinc-900">
                    Collections
                  </summary>
                  <ul className="absolute right-0 z-30 mt-2 min-w-[10rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                    <li>
                      <Link
                        to={storeHref("/collections", nav)}
                        className="block px-4 py-2 hover:bg-violet-50"
                      >
                        All collections
                      </Link>
                    </li>
                    {ctx.collections.map((c) => (
                      <li key={c.id}>
                        <Link
                          to={storeHref(`/collections/${c.slug}`, nav)}
                          className="block px-4 py-2 hover:bg-violet-50"
                        >
                          {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <Link
                  to={storeHref("/collections", nav)}
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  Collections
                </Link>
              )}
              <Link to={storeHref("/blog", nav)} className="text-sm text-zinc-600 hover:text-zinc-900">
                Blog
              </Link>
              {!ctx.theme.storeClosed ? (
                <Link
                  to={storeHref("/wishlist", nav)}
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  Wishlist
                </Link>
              ) : null}
            </>
          ) : null}
          {(ctx.theme.navLinks ?? [])
            .filter((l) => l.header !== false)
            .map((l) => (
              <Link
                key={l.path + l.label}
                to={storeHref(l.path, nav)}
                className="text-sm text-zinc-600 hover:text-zinc-900"
              >
                {l.label}
              </Link>
            ))}
          <LocaleSwitcher />
          <Link
            to={storeHref("/account", nav)}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Account
          </Link>
          {!ctx.theme.storeClosed ? (
            <Link to={storeHref("/cart", nav)} className="relative inline-flex">
              <Button variant="secondary">{ctx.cartLabel}</Button>
              {ctx.cartCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
                  style={{ backgroundColor: ctx.primaryColor }}
                >
                  {ctx.cartCount > 99 ? "99+" : ctx.cartCount}
                </span>
              ) : null}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
