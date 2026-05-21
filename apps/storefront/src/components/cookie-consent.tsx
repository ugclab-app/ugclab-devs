import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/context/store";
import { useStoreParams } from "@/hooks/use-store-params";
import { storeHref } from "@/lib/store-href";

const STORAGE_KEY = "ugclab_cookie_consent";

export function CookieConsent() {
  const ctx = useStore();
  const { theme, settings } = ctx;
  const { locale } = useStoreParams();
  const nav = { locale, tenant: ctx.tenant.slug };
  const [visible, setVisible] = useState(false);

  const enabled = theme.cookieConsentEnabled !== false;
  const privacyPath = settings?.privacyUrl
    ? settings.privacyUrl.startsWith("http")
      ? settings.privacyUrl
      : storeHref(settings.privacyUrl, nav)
    : storeHref("/pages/privacy", nav);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(`${STORAGE_KEY}_${ctx.tenant.id}`)) return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [enabled, ctx.tenant.id]);

  if (!enabled || !visible) return null;

  const message =
    theme.cookieConsentMessage ??
    "We use cookies for checkout and analytics. See our privacy policy.";

  function accept() {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${ctx.tenant.id}`, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div
      className="cookie-consent fixed bottom-0 left-0 right-0 z-[60] border-t border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-md sm:rounded-xl sm:border"
      role="dialog"
      aria-label="Cookie consent"
    >
      <p className="text-sm text-zinc-700">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={accept}
          className="store-btn-primary px-4 py-2 text-sm"
        >
          Accept
        </button>
        {settings?.privacyUrl || settings?.privacyPolicy ? (
          typeof privacyPath === "string" && privacyPath.startsWith("http") ? (
            <a href={privacyPath} className="store-btn-secondary px-4 py-2 text-sm">
              Privacy
            </a>
          ) : (
            <Link to={privacyPath as string} className="store-btn-secondary px-4 py-2 text-sm">
              Privacy
            </Link>
          )
        ) : null}
      </div>
    </div>
  );
}
