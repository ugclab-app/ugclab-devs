import { locales, localeLabel, type Locale } from "@ugclab/i18n";
import { useAdminLocale } from "@/context/admin-locale";

/** Merchant admin UI language (not storefront default locale). */
export function AdminLocaleSwitcher({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = useAdminLocale();

  return (
    <label
      className={
        compact
          ? "flex w-full items-center gap-2 rounded-lg border border-zinc-100/80 bg-zinc-50/60 px-2 py-1"
          : "flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
      }
    >
      {compact ? (
        <span className="shrink-0 text-zinc-400" aria-hidden title={t.language}>
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m12.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.467.732-3.553"
            />
          </svg>
        </span>
      ) : (
        <span className="text-zinc-600">{t.language}</span>
      )}
      <select
        className={
          compact
            ? "ugclab-select min-h-0 flex-1 border-0 bg-transparent py-0.5 pl-0 pr-6 text-xs leading-tight shadow-none focus:ring-0"
            : "ugclab-select w-full text-sm"
        }
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t.language}
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeLabel(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
