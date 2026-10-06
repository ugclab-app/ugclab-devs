import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@ugclab/ui";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { useStorefrontMessages } from "@/hooks/use-storefront-messages";
import { storeHref } from "@/lib/store-href";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { CountrySwitcher } from "@/components/country-switcher";
import { StoreSearch } from "@/components/store-search";

export function StoreHeader() {
  const ctx = useStore();
  const sf = useStorefrontMessages();
  const { locale, tenant } = useStoreParams();
  const nav = { locale: ctx.locale, tenant: ctx.tenant.slug };
  const layout = ctx.theme.headerLayout ?? "logo-left";
  const sticky = ctx.theme.headerSticky !== false;
  const showSearch = ctx.theme.headerShowSearch !== false;
  const minimal = layout === "minimal";
  const centered = layout === "logo-center";
  const [menuOpen, setMenuOpen] = useState(false);

  const brand = (
    <Link
      to={storeHref("/", nav)}
      className={`flex items-center gap-3 ${centered ? "justify-center" : ""}`}
    >
      {ctx.logoUrl ? (
        <img src={ctx.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ) : null}
      <span className="text-xl font-bold" style={{ color: ctx.primaryColor }}>
        {ctx.tenant.name}
      </span>
    </Link>
  );

  const navLinks = (
    <>
      {!ctx.theme.hideDefaultNav && !minimal ? (
        <>
          {ctx.collections.length > 0 ? (
            <details className="relative text-sm">
              <summary className="cursor-pointer list-none text-zinc-600 hover:text-zinc-900">
                {sf.nav.collections}
              </summary>
              <ul className="absolute right-0 z-30 mt-2 min-w-[10rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                <li>
                  <Link
                    to={storeHref("/collections", nav)}
                    className="block px-4 py-2 hover:bg-violet-50"
                  >
                    {sf.nav.allCollections}
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
              {sf.nav.collections}
            </Link>
          )}
          <Link to={storeHref("/blog", nav)} className="text-sm text-zinc-600 hover:text-zinc-900">
            {sf.nav.blog}
          </Link>
          {!ctx.theme.storeClosed ? (
            <Link
              to={storeHref("/wishlist", nav)}
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              {sf.nav.wishlist}
            </Link>
          ) : null}
        </>
      ) : null}
      {!minimal
        ? (ctx.theme.navLinks ?? [])
            .filter((l) => l.header !== false)
            .map((l) => (
              <Link
                key={l.path + l.label}
                to={storeHref(l.path, nav)}
                className="text-sm text-zinc-600 hover:text-zinc-900"
              >
                {l.label}
              </Link>
            ))
        : null}
    </>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      {showSearch && !minimal ? (
        <StoreSearch locale={locale} tenantSlug={tenant} />
      ) : null}
      {navLinks}
      <LocaleSwitcher />
      <CountrySwitcher />
      <CurrencySwitcher />
      {!minimal ? (
        <Link
          to={storeHref("/account", nav)}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          {sf.nav.account}
        </Link>
      ) : null}
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
  );

  const menuButton = (
    <button
      type="button"
      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 md:hidden"
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen((open) => !open)}
    >
      {menuOpen ? "Close" : "Menu"}
    </button>
  );

  return (
    <header
      className={`${sticky ? "sticky top-0 z-20" : ""} border-b border-zinc-200 bg-white/95 py-4 backdrop-blur-md`}
      style={{ borderBottomColor: ctx.primaryColor }}
    >
      {centered ? (
        <div className="store-container flex flex-col items-center gap-4">
          <div className="flex w-full items-center justify-between md:justify-center">
            {brand}
            {menuButton}
          </div>
          <div className={`${menuOpen ? "flex" : "hidden"} w-full flex-col items-center gap-4 md:flex`}>
            {actions}
          </div>
        </div>
      ) : (
        <div className="store-container flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            {brand}
            <div className="flex items-center gap-2 md:hidden">
              {menuButton}
              {!ctx.theme.storeClosed ? (
                <Link to={storeHref("/cart", nav)} className="relative inline-flex">
                  <Button variant="secondary">{ctx.cartLabel}</Button>
                </Link>
              ) : null}
            </div>
          </div>
          <div
            className={`${menuOpen ? "flex" : "hidden"} flex-col gap-4 md:flex md:flex-row md:items-center`}
          >
            {actions}
          </div>
        </div>
      )}
    </header>
  );
}
