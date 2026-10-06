import { Link } from "react-router-dom";
import { useStore } from "@/context/store";
import { useStorefrontMessages } from "@/hooks/use-storefront-messages";
import { storeHref } from "@/lib/store-href";

export function StoreFooter() {
  const shell = useStore();
  const sf = useStorefrontMessages();
  const { locale, tenant, collections, storePages, settings, theme } = shell;
  const nav = { locale, tenant: tenant.slug };
  const social = theme.socialLinks;
  const layout = theme.footerLayout ?? "columns-3";
  const showSocial = theme.footerShowSocial !== false;
  const showCollections = theme.footerShowCollections !== false;
  const customCols = theme.footerColumns ?? [];

  if (layout === "minimal") {
    return (
      <footer className="mt-auto border-t border-zinc-200 bg-white px-6 py-8">
        <p className="store-container text-center text-xs text-zinc-400">
          {theme.footerCopyright?.trim() ||
            `© ${new Date().getFullYear()} ${tenant.name}. ${sf.footer.poweredBy}`}
        </p>
      </footer>
    );
  }

  const gridClass =
    layout === "stacked"
      ? "grid gap-8"
      : layout === "columns-2"
        ? "grid gap-8 sm:grid-cols-2"
        : "grid gap-8 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white px-6 py-12">
      <div className={`store-container ${gridClass}`}>
        <div>
          <p className="font-semibold text-zinc-900">{tenant.name}</p>
          <p className="mt-1 text-sm text-zinc-500">{sf.footer.thanks}</p>
          {settings?.contactEmail || settings?.contactPhone || settings?.businessAddress ? (
            <div className="mt-3 space-y-1 text-sm text-zinc-600">
              {settings.contactEmail ? (
                <a href={`mailto:${settings.contactEmail}`} className="block hover:text-violet-700">
                  {settings.contactEmail}
                </a>
              ) : null}
              {settings.contactPhone ? <p>{settings.contactPhone}</p> : null}
              {settings.businessAddress ? (
                <p className="whitespace-pre-line text-zinc-500">{settings.businessAddress}</p>
              ) : null}
            </div>
          ) : null}
          {showSocial && (social?.instagram || social?.telegram || social?.tiktok) ? (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {social?.instagram ? (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-600 hover:underline"
                >
                  Instagram
                </a>
              ) : null}
              {social?.telegram ? (
                <a
                  href={social.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-600 hover:underline"
                >
                  Telegram
                </a>
              ) : null}
              {social?.tiktok ? (
                <a
                  href={social.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-600 hover:underline"
                >
                  TikTok
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        {showCollections && collections.length > 0 && layout !== "stacked" ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {sf.footer.collections}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {collections.map((c) => (
                <li key={c.id}>
                  <Link
                    to={storeHref(`/collections/${c.slug}`, nav)}
                    className="text-zinc-700 hover:text-violet-700"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {customCols.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {col.title}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  {l.href.startsWith("http") ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-700 hover:text-violet-700"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      to={storeHref(l.href, nav)}
                      className="text-zinc-700 hover:text-violet-700"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {sf.footer.info}
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {(shell.theme.navLinks ?? [])
              .filter((l) => l.footer !== false)
              .map((l) => (
                <li key={l.path + l.label}>
                  <Link
                    to={storeHref(l.path, nav)}
                    className="text-zinc-700 hover:text-violet-700"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            {storePages.map((pg) => (
              <li key={pg.slug}>
                <Link
                  to={storeHref(`/pages/${pg.slug}`, nav)}
                  className="text-zinc-700 hover:text-violet-700"
                >
                  {pg.title}
                </Link>
              </li>
            ))}
            {settings?.privacyPolicy || settings?.privacyUrl ? (
              <li>
                <Link
                  to={
                    settings.privacyPolicy
                      ? storeHref("/policies/privacy", nav)
                      : settings.privacyUrl!
                  }
                  className="text-zinc-700 hover:text-violet-700"
                >
                  {sf.footer.privacy}
                </Link>
              </li>
            ) : null}
            {settings?.refundPolicy || settings?.refundUrl ? (
              <li>
                <Link
                  to={
                    settings.refundPolicy
                      ? storeHref("/policies/refund", nav)
                      : settings.refundUrl!
                  }
                  className="text-zinc-700 hover:text-violet-700"
                >
                  {sf.footer.refunds}
                </Link>
              </li>
            ) : null}
            {settings?.termsOfService || settings?.termsUrl ? (
              <li>
                <Link
                  to={
                    settings.termsOfService
                      ? storeHref("/policies/terms", nav)
                      : settings.termsUrl!
                  }
                  className="text-zinc-700 hover:text-violet-700"
                >
                  Terms of service
                </Link>
              </li>
            ) : null}
            {settings?.shippingPolicy || settings?.shippingUrl ? (
              <li>
                <Link
                  to={
                    settings.shippingPolicy
                      ? storeHref("/policies/shipping", nav)
                      : settings.shippingUrl!
                  }
                  className="text-zinc-700 hover:text-violet-700"
                >
                  Shipping policy
                </Link>
              </li>
            ) : null}
            {settings?.legalNotice || settings?.legalNoticeUrl ? (
              <li>
                <Link
                  to={
                    settings.legalNotice
                      ? storeHref("/policies/legal", nav)
                      : settings.legalNoticeUrl!
                  }
                  className="text-zinc-700 hover:text-violet-700"
                >
                  Legal notice
                </Link>
              </li>
            ) : null}
            {settings?.contactPolicy ||
            settings?.contactEmail ||
            settings?.contactPhone ||
            settings?.businessAddress ? (
              <li>
                <Link
                  to={storeHref("/policies/contact", nav)}
                  className="text-zinc-700 hover:text-violet-700"
                >
                  Contact
                </Link>
              </li>
            ) : null}
            {settings?.returnRules ? (
              <li>
                <Link
                  to={storeHref("/policies/returns", nav)}
                  className="text-zinc-700 hover:text-violet-700"
                >
                  Returns
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <p className="store-container mt-10 border-t border-zinc-100 pt-6 text-center text-xs text-zinc-400">
        {theme.footerCopyright?.trim() ||
          `© ${new Date().getFullYear()} ${tenant.name}. ${sf.footer.poweredBy}`}
      </p>
    </footer>
  );
}
