import { Link } from "react-router-dom";
import { useStore } from "@/context/store";
import { storeHref } from "@/lib/store-href";

export function StoreFooter() {
  const shell = useStore();
  const { locale, tenant, collections, storePages, settings, theme } = shell;
  const nav = { locale, tenant: tenant.slug };
  const social = theme.socialLinks;

  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white px-6 py-12">
      <div className="store-container grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-semibold text-zinc-900">{tenant.name}</p>
          <p className="mt-1 text-sm text-zinc-500">Thanks for shopping with us.</p>
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
          {social?.instagram || social?.telegram || social?.tiktok ? (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {social.instagram ? (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-600 hover:underline"
                >
                  Instagram
                </a>
              ) : null}
              {social.telegram ? (
                <a
                  href={social.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-600 hover:underline"
                >
                  Telegram
                </a>
              ) : null}
              {social.tiktok ? (
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
        {collections.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Collections
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
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Info</p>
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
                  Privacy
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
                  Refunds
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <p className="store-container mt-10 border-t border-zinc-100 pt-6 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} {tenant.name}. Powered by Tescommerce.
      </p>
    </footer>
  );
}
